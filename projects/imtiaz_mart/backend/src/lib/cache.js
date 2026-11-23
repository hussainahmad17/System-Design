import { redis } from "../db/redis.js";

// Cache-aside helper (docs/Redis_Cache.md):
//   1. look in Redis       -> hit: return it, MongoDB is never touched
//   2. miss: load from DB  -> store in Redis with a TTL -> return
//
// Fail open: if Redis is down, slow or returns garbage, we just load from MongoDB.
// The cache can make the store faster; it must never make it unavailable.

const COMMAND_TIMEOUT_MS = 400; // a cache slower than this isn't helping; go to the DB
// misses = real DB loads; coalesced = requests that waited for someone else's load instead
const stats = { hits: 0, misses: 0, coalesced: 0, errors: 0, bypassed: 0 };

// Single-flight: key -> Promise of the DB load that is running right now (in THIS process).
// Load test: when a hot entry expired, up to 291 requests missed at once and all ran the
// same MongoDB query (cache stampede). Now the first request loads; the rest await its promise.
// Entries live only while a load (and its cache write) is running, so the map stays tiny.
const inFlight = new Map();

/** Join the running load for this key, or start one. `store` writes the result to Redis. */
function loadOnce(key, load, store) {
  const running = inFlight.get(key);
  if (running) {
    stats.coalesced++;
    return running;
  }
  stats.misses++;
  const p = load();
  inFlight.set(key, p);
  // Keep the entry until the Redis write lands, so requests arriving in that gap reuse
  // this value instead of missing again. The caller does NOT wait for the write.
  p.then(store)
    .catch(() => {}) // load errors reach the callers through `p`; don't cache failures
    .finally(() => inFlight.delete(key));
  return p;
}

export function withTimeout(promise) {
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
  // A load for this key is already running: wait for it (skips a Redis round trip too)
  const running = inFlight.get(key);
  if (running) {
    stats.coalesced++;
    return { value: await running, hit: false };
  }

  const r = redis();
  if (!r) {
    // Redis down: every request would hit MongoDB, so single-flight matters most here
    stats.bypassed++;
    return { value: await loadOnce(key, load, () => {}), hit: false };
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

  // DB errors propagate as normal; failures are never cached
  const value = await loadOnce(key, load, (v) =>
    withTimeout(r.set(key, JSON.stringify(v), { expiration: { type: "EX", value: ttlSeconds } })).catch(() => {
      stats.errors++;
    }),
  );
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
  const lookups = stats.hits + stats.misses + stats.coalesced;
  return {
    enabled: redis() !== null,
    ...stats,
    hitRate: lookups ? Number((stats.hits / lookups).toFixed(3)) : null,
  };
}
