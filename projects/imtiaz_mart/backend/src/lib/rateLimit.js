import { MemoryStore, rateLimit } from "express-rate-limit";
import { redis } from "../db/redis.js";
import { withTimeout } from "./cache.js";

/**
 * Rate-limit counters shared by EVERY API process, kept in Redis.
 * Why: Nginx spreads requests over 3 processes. With per-process memory counters,
 * "10 failed logins per 15 min" quietly becomes 30 (10 on each process).
 *
 * Fallback: if Redis is down or slow, count in this process's memory instead.
 * Limits get looser (per process) but never switch off, and requests never fail because of Redis.
 */
class SharedStore {
  localKeys = false; // tells express-rate-limit the counts are shared, not per process

  constructor(name) {
    this.prefix = `rl:${name}:`;
    this.memory = new MemoryStore();
  }

  init(options) {
    this.windowMs = options.windowMs;
    this.memory.init(options);
  }

  async increment(key) {
    const r = redis();
    if (r) {
      try {
        const k = this.prefix + key;
        // One round trip: count +1, start the window on the FIRST hit only (NX), read time left
        const [hits, , ttl] = await withTimeout(r.multi().incr(k).pExpire(k, this.windowMs, "NX").pTTL(k).exec());
        return { totalHits: Number(hits), resetTime: new Date(Date.now() + Math.max(Number(ttl), 0)) };
      } catch {
        /* fall back to memory below */
      }
    }
    return this.memory.increment(key);
  }

  // Used by skipSuccessfulRequests: a successful login gives its hit back
  async decrement(key) {
    const r = redis();
    if (r) {
      try {
        await withTimeout(r.decr(this.prefix + key));
        return;
      } catch {
        /* fall back */
      }
    }
    await this.memory.decrement(key);
  }

  async resetKey(key) {
    await withTimeout(redis()?.del(this.prefix + key) ?? Promise.resolve()).catch(() => {});
    await this.memory.resetKey(key);
  }
}

/**
 * @param {string} name     unique per limiter: becomes the Redis key prefix (rl:<name>:<ip>)
 * @param {number} limit    requests allowed per window
 * @param {number} windowMs window length
 * @param {string} message  shown to the client when limited
 * @param {object} [extra]  other express-rate-limit options (e.g. skipSuccessfulRequests)
 */
export const limiter = (name, limit, windowMs, message, extra = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { code: "RATE_LIMITED", message } },
    store: new SharedStore(name),
    ...extra,
  });
