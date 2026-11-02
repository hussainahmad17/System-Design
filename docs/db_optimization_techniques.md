DB Optimization techniques:


1. Avoid select *
Select only the columns you need.
Why: less data read and sent. If all selected columns are in an index, the DB reads only the index (covering index).

2. Use Indexing
An index is a sorted, balanced tree (B-tree). Lookup is O(log n) instead of scanning all rows O(n).
Works for =, ranges (>, <, BETWEEN) and ORDER BY.
Add indexes on columns used in WHERE, JOIN, ORDER BY in read-heavy tables.
Trade-off: slower writes (index must be updated) and extra storage.

3. Primary key optimization
Use an auto-increment integer primary key.
- Integers compare faster than strings.
- Smaller key = smaller index = more fits in memory.
- New IDs go at the end of the B-tree. Random keys (UUIDs, strings) insert anywhere, causing page splits and fragmentation.

4. Composite indexing
An index on multiple columns, e.g. INDEX (country, city).
Column order matters (leftmost prefix rule):
- WHERE country = 'PK' AND city = 'Lahore' -> uses index
- WHERE country = 'PK' -> uses index
- WHERE city = 'Lahore' -> can't use index
Put equality columns first, then range/sort columns.

5. Pagination optimization
SELECT * FROM products ORDER BY id LIMIT 20 OFFSET 100000; (Slow)
-> DB reads 100,000 rows, throws them away, returns 20. Slower as offset grows.

SELECT * FROM products WHERE id > :last_seen_id ORDER BY id LIMIT 20; (Fast)
-> Keyset (cursor) pagination. Client sends the last id it got. DB jumps there using the index and reads 20 rows. Same speed on any page.

Notes:
- Always use ORDER BY, otherwise rows can repeat or be skipped.
- Use the last seen id, not a calculated one. Deleted rows leave gaps in ids.
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

7. Database Normalization
Remove duplicate data by splitting it into tables linked with foreign keys.
Keeps data consistent: update in one place.
Trade-off: more JOINs on reads. Read-heavy systems sometimes denormalize on purpose.

8. Connection Pooling
Keep a set of DB connections open and reuse them.
Avoids the cost of opening and closing a connection for every query.

9. Caching
Store frequently read data in memory (e.g. Redis).
Example: profile data rarely changes, so cache it.
Trade-off: when data changes, update or delete the cache entry, or users see stale data.

10. Read Replicas
One primary DB handles writes; replicas copy its data and handle reads.
Spreads read load across servers.
Trade-off: replicas lag slightly, so a read right after a write may return old data.
