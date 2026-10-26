# Cache

## What is Caching?
Caching is the technique of storing frequently requested data in fast, temporary storage (usually memory/RAM, e.g. Redis), so it can be returned quickly without going to the database every time.

## Example: Netflix Plans
- Netflix shows its subscription plans through an API call.
- The plans are the same for every user and rarely change.
- Without a cache, every request goes: **API → database → response**.
- With a cache, the plans are stored in memory after the first request. Later requests read them from the cache, so the database is not queried again.

## Benefits
- **Lower latency:** reading from memory is much faster than querying a database.
- **Less database load:** fewer queries reach the database.

## Trade-off
Cached data can become stale. When the plans change, the cache must be updated or cleared (cache invalidation).
