import { redis } from "../db/redis.js";

// Cache-aside helper (docs/Redis_Cache.md):
//   1. look in Redis       -> hit: return it, MongoDB is never touched
//   2. miss: load from DB  -> store in Redis with a TTL -> return
//
// Fail open: if Redis is down, slow or returns garbage, we just load from MongoDB.
// The cache can make the store faster; it must never make it unavailable.

const COMMAND_TIMEOUT_MS = 400; // a cache slower than this isn't helping; go to the DB
const stats = { hits: 0, misses: 0, errors: 0, bypassed: 0 };

function withTimeout(promise) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("redis timeout")), COMMAND_TIMEOUT_MS);
    }),
  ]).finally(() => clearTimeout(timer));
}

/**
 * @template T
 * @param {string} key
 * @param {number} ttlSeconds  every entry expires, so stale data and memory both self-heal
 * @param {() => Promise<T>} load  the MongoDB query to run on a miss
 * @returns {Promise<{ value: T, hit: boolean }>}
 */
export async function cached(key, ttlSeconds, load) {
  const r = redis();
  if (!r) {
    stats.bypassed++;
    return { value: await load(), hit: false };
  }

  try {
    const raw = await withTimeout(r.get(key));
    if (raw !== null) {
      stats.hits++;
      return { value: JSON.parse(raw), hit: true };
    }
  } catch {
    stats.errors++; // timeout, disconnect or bad JSON: treat as a miss
  }

  stats.misses++;
  const value = await load(); // DB errors propagate as normal; failures are never cached
  // Write in the background: the user doesn't wait for the cache write
  withTimeout(r.set(key, JSON.stringify(value), { expiration: { type: "EX", value: ttlSeconds } })).catch(() => {
    stats.errors++;
  });
  return { value, hit: false };
}

/** Delete keys (used when the underlying data changes). Never throws. */
export async function invalidate(...keys) {
  const r = redis();
  if (!r || keys.length === 0) return;
  await withTimeout(r.del(keys)).catch(() => {
    stats.errors++;
  });
}

export function cacheStats() {
  const lookups = stats.hits + stats.misses;
  return {
    enabled: redis() !== null,
    ...stats,
    hitRate: lookups ? Number((stats.hits / lookups).toFixed(3)) : null,
  };
}
