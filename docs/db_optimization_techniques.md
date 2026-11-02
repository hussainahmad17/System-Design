DB Optimization techniques:


1. Avoid select *
Select only the columns you need.
Why: less data is read from disk and sent over the network, and if every selected column is in an index, the DB can answer from the index alone (a "covering index") without touching the table.

2. Use Indexing
An index is usually a B-tree: a balanced, sorted tree. The DB starts at the root and goes down one level at a time, so finding a value takes O(log n) steps instead of scanning every row (O(n)). It works for exact matches (=), ranges (>, <, BETWEEN) and ORDER BY.
Add indexes on columns used in WHERE, JOIN and ORDER BY, especially in read-heavy tables.
Trade-off: every INSERT/UPDATE/DELETE must also update the index, and indexes use extra storage. So don't index everything, and avoid indexes on write-heavy tables unless queries need them.

3. Primary key optimization
Use a numeric (auto-increment integer) primary key.
Why:
- Comparing integers is faster than comparing strings (strings are compared character by character, with collation rules).
- Integers are small (4-8 bytes), so the index is smaller and more of it fits in memory. In MySQL InnoDB, every secondary index also stores the primary key, so a big PK makes every index bigger.
- Increasing IDs are always inserted at the end of the B-tree. Random keys (random UUIDs, strings) are inserted in random places, which causes page splits and fragmentation.

4. Composite indexing
An index on more than one column, e.g. INDEX (country, city).
Column order matters (leftmost prefix rule):
- WHERE country = 'PK' AND city = 'Lahore' -> uses the index
- WHERE country = 'PK' -> uses the index
- WHERE city = 'Lahore' -> CANNOT use the index (skips the first column)
Rule of thumb: put equality-filter columns first, then range/sort columns.

5. Pagination optimization
SELECT * FROM products ORDER BY id LIMIT 20 OFFSET 100000; (Slow)

-> To skip the records, the database must still walk through all 100,000 rows, then throw them away and return the next 20. The bigger the offset, the slower the query (O(offset + limit)).

SELECT * FROM products WHERE id > :last_seen_id ORDER BY id LIMIT 20; (Fast)

-> This is keyset (cursor) pagination. Instead of a page number, the client sends the last id it received. The database uses the B-tree index on id to jump directly to that position and read the next 20 rows. Cost stays the same no matter how deep you page (O(log n + limit)).

Notes:
- ORDER BY is required in both queries. Without it, the row order is not guaranteed, so pages can repeat or skip rows.
- "id > 100000" is NOT the same as "OFFSET 100000" unless ids have no gaps (deleted rows create gaps). That's why we use the last id seen, not a calculated number.
- Trade-off: you can't jump straight to "page 500"; only next/previous. Fine for infinite scroll and feeds.

6. N + 1 query problem
If we have to show 50 users and their posts, we'll fire 51 queries.
One query for getting all the users (select * from users limit 50)
Then, for each user, one query to get their posts (select * from posts where user_id = ?) -> 50 more queries.
Total = 1 + N queries.

Why it's slow: each query is a separate round trip to the database (network latency + parsing + planning). 51 round trips at ~2 ms each is ~100 ms, and it grows linearly with N. It's easy to miss because ORMs do this silently when you access user.posts inside a loop.

Solution 1: Batch with IN (best general solution, 2 queries total)

  -- Query 1: get the users
  SELECT id, name FROM users ORDER BY id LIMIT 50;

  -- Query 2: get posts for ALL those users at once
  SELECT id, user_id, title FROM posts WHERE user_id IN (1, 2, 3, ..., 50);

Then group posts by user_id in application code using a hash map:

  postsByUser = {}
  for post in posts:
      postsByUser[post.user_id].append(post)
  for user in users:
      user.posts = postsByUser[user.id] or []

-> 2 queries no matter how many users. Grouping with a hash map is O(users + posts) instead of searching the posts list for every user.
-> This is what ORMs do with eager loading: Django prefetch_related, Rails includes/preload, Laravel with(), Sequelize include with separate: true, Prisma include. In GraphQL, the DataLoader library does the same batching.

Solution 2: JOIN (1 query)

  SELECT u.id, u.name, p.id AS post_id, p.title
  FROM users u
  LEFT JOIN posts p ON p.user_id = u.id
  WHERE u.id IN (SELECT id FROM users ORDER BY id LIMIT 50);

-> Good for one-to-one or small one-to-many relations.
-> Downsides: user columns are repeated for every post (a user with 100 posts = 100 copies of user data). And putting LIMIT 50 directly on the joined result limits rows (users x posts), not users, which breaks pagination; that's why the subquery is needed above.

Which one is best?
- Use the IN batch (Solution 1) as the default for one-to-many (user -> posts).
- Use JOIN when each parent has only one or a few children (e.g. post -> author).

Required for both: an index on posts.user_id. Without it, each lookup scans the full posts table and the fix is still slow.

  CREATE INDEX idx_posts_user_id ON posts(user_id);

Bonus: if you only need counts (e.g. "user has 12 posts"), don't load posts at all:

  SELECT user_id, COUNT(*) FROM posts WHERE user_id IN (...) GROUP BY user_id;
