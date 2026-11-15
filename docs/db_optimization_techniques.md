DB Optimization techniques:


1. Avoid select *
Select only the columns you need.
Why: less data read and sent. If all selected columns are in an index, the DB reads only the index (covering index).

2. Use Indexing
An index is a sorted, balanced tree (B-tree). Lookup is O(log n) instead of scanning all rows O(n).
Works for =, ranges (>, <, BETWEEN) and ORDER BY.
Add indexes on columns used in WHERE, JOIN, ORDER BY in read-heavy tables.
Trade-off: slower writes (index must be updated) and extra storage.
Skip indexes on columns with few distinct values (e.g. is_active true/false). The DB will often scan the table anyway.

3. Primary key optimization
Use an auto-increment integer primary key.
- Integers compare faster than strings.
- Smaller key = smaller index = more fits in memory.
- New IDs go at the end of the B-tree. Random keys (UUIDv4, strings) insert anywhere, causing page splits and fragmentation.
Note: if you need IDs generated outside the DB (distributed systems, IDs safe to expose in URLs), use a time-ordered ID like UUIDv7 or ULID. It is unique like a UUID but still inserts at the end of the B-tree.

4. Composite indexing
An index on multiple columns, e.g. INDEX (country, city).
Column order matters (leftmost prefix rule):
- WHERE country = 'PK' AND city = 'Lahore' -> uses index
- WHERE country = 'PK' -> uses index
- WHERE city = 'Lahore' -> can't use the index efficiently
Put equality columns first, then range/sort columns.

5. Pagination optimization
SELECT * FROM products ORDER BY id LIMIT 20 OFFSET 100000; (Slow)
-> DB reads 100,000 rows, throws them away, returns 20. Slower as offset grows.

SELECT * FROM products WHERE id > :last_seen_id ORDER BY id LIMIT 20; (Fast)
-> Keyset (cursor) pagination. Client sends the last id it got. DB jumps there using the index and reads 20 rows. Same speed on any page.

Notes:
- Always use ORDER BY, otherwise rows can repeat or be skipped.
- Use the last seen id, not a calculated one. Deleted rows leave gaps in ids.
- Sorting by a non-unique column (e.g. created_at)? Add id as a tie-breaker:
    WHERE (created_at, id) < (:last_created_at, :last_id)
    ORDER BY created_at DESC, id DESC LIMIT 20;
  with INDEX (created_at, id). Otherwise rows with the same created_at can be skipped.
- Trade-off: no jumping to "page 500", only next/previous.

6. N + 1 query problem
Show 50 users with their posts:
- 1 query for users: SELECT * FROM users LIMIT 50
- 1 query per user for posts: SELECT * FROM posts WHERE user_id = ?
Total = 1 + 50 = 51 queries.
Why slow: each query is a separate round trip to the DB. ORMs do this silently when you access user.posts in a loop.

Solution: Batch with IN (best default, 2 queries)

  SELECT id, name FROM users ORDER BY id LIMIT 50;
  SELECT id, user_id, title FROM posts WHERE user_id IN (1, 2, ..., 50);

Most ORMs do this for you with "eager loading" (e.g. include / prefetch_related / with).
Needs an index on posts.user_id.

7. Database Normalization
Remove duplicate data by splitting it into tables linked with foreign keys.
Keeps data consistent: update in one place.
Trade-off: more JOINs on reads. Read-heavy systems sometimes denormalize on purpose (see 15).

8. Connection Pooling
Keep a set of DB connections open and reuse them.
Avoids the cost of opening and closing a connection for every query.
Keep the pool small (e.g. 10-20 per app server). Too many connections make the DB slower, not faster.

9. Caching
Store frequently read data in memory (e.g. Redis).
Example: profile data rarely changes, so cache it.
Trade-off: when data changes, update or delete the cache entry, or users see stale data.

10. Read Replicas
One primary DB handles writes; replicas copy its data and handle reads.
Spreads read load across servers.
Trade-off: replicas lag slightly, so a read right after a write may return old data.

11. Analyze queries with EXPLAIN (do this first)
Don't guess. Ask the DB how it runs the query.

  EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 42;

Look for:
- "Seq Scan" / "type: ALL" -> full table scan, probably a missing index.
- "Index Scan" / "type: ref" -> index is used.
- Rows examined much larger than rows returned -> query reads too much.
Also turn on the slow query log to find which queries to fix.

12. Write index-friendly (sargable) queries
An index only helps if the column is used as-is. Wrapping it in a function or math hides it from the index.

  WHERE YEAR(created_at) = 2025                              (Slow: full scan)
  WHERE created_at >= '2025-01-01' AND created_at < '2026-01-01'  (Fast: uses index)

  WHERE price * 1.1 > 100     (Slow)
  WHERE price > 100 / 1.1     (Fast)

  WHERE name LIKE '%ali'      (Slow: leading wildcard, index can't help)
  WHERE name LIKE 'ali%'      (Fast: prefix search uses index)

Also: compare with the same type (WHERE phone = '0300...' if phone is VARCHAR, not a number), or the DB may convert every row and skip the index.

13. Batch writes
Inserting 1,000 rows one by one = 1,000 round trips and 1,000 commits.

  INSERT INTO logs (msg) VALUES ('a');   -- x1000 (Slow)
  INSERT INTO logs (msg) VALUES ('a'), ('b'), ('c'), ...;   (Fast: 1 query)

Or wrap many writes in one transaction. For huge imports use bulk tools (COPY in Postgres, LOAD DATA in MySQL).
Trade-off: keep batches moderate (e.g. 500-5,000 rows). Huge batches hold locks long and use a lot of memory.

14. Choose the right data types
Smaller types = smaller rows and indexes = more data fits in memory.
- Use INT, not BIGINT, if values stay under ~2 billion.
- Use DATE/TIMESTAMP for dates, not strings ('2025-01-01' as VARCHAR can't be compared or ranged correctly).
- Use DECIMAL for money, not FLOAT (float has rounding errors).
- Use VARCHAR(n) with a sensible size, avoid TEXT for short values that you filter on.

15. Denormalization and materialized views
Store pre-computed or duplicated data so reads skip expensive JOINs or aggregations.
Example: a posts table with a comment_count column, updated when a comment is added,
instead of running SELECT COUNT(*) FROM comments WHERE post_id = ? on every page view.
Materialized view: the DB stores the result of a heavy query and you refresh it periodically.

  CREATE MATERIALIZED VIEW daily_sales AS
    SELECT DATE(created_at) AS day, SUM(amount) FROM orders GROUP BY day;
  REFRESH MATERIALIZED VIEW daily_sales;

Trade-off: data can be stale or out of sync; writes become more complex.

16. Partitioning
Split one big table into smaller pieces inside the same DB, usually by date or range.
Example: orders partitioned by month. A query for "orders in March 2025" only scans the March partition (partition pruning).
Bonus: deleting old data = drop an old partition, instantly, instead of a slow DELETE of millions of rows.
Trade-off: queries that don't filter by the partition key must check every partition.

17. Sharding (horizontal scaling)
Split data across multiple DB servers. Each server (shard) holds a subset of rows.
Example: users with user_id % 4 = 0 on shard 0, = 1 on shard 1, and so on.
Use when one server can't handle the write load or data size, even after everything above.
Trade-off: cross-shard JOINs and transactions become hard; picking a bad shard key creates "hot" shards; resharding is painful. Use it last.

18. Full-text search
LIKE '%keyword%' scans every row and can't use a normal index.
Use a full-text index instead:

  -- Postgres
  CREATE INDEX idx_posts_search ON posts USING GIN (to_tsvector('english', title));
  SELECT * FROM posts WHERE to_tsvector('english', title) @@ to_tsquery('database');

  -- MySQL
  CREATE FULLTEXT INDEX idx_title ON posts(title);
  SELECT * FROM posts WHERE MATCH(title) AGAINST('database');

For large-scale search (typo tolerance, ranking, filters) use a search engine like Elasticsearch.
Trade-off: extra index to maintain; search engine must be kept in sync with the DB.