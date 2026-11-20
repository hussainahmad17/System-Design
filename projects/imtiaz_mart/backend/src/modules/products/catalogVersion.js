import { redis } from "../../db/redis.js";

// Versioned cache keys: every product cache key contains the current catalog version.
// When products change, INCR the version and all old keys are simply never read again
// (Redis deletes them when their TTL runs out). One O(1) command instead of finding
// and deleting thousands of keys.
//
// The version is remembered in this process for 10 s, so a normal request costs one Redis
// round trip (the page) instead of two (version + page). Trade-off: after a bump, this
// server may serve the previous version for up to 10 s.

const KEY = "catalog:version";
const MEMO_MS = 10_000;
let memo = { value: "0", at: 0 };

export async function getCatalogVersion() {
  if (Date.now() - memo.at < MEMO_MS) return memo.value;
  const r = redis();
  if (!r) return memo.value;
  try {
    memo = { value: (await r.get(KEY)) ?? "0", at: Date.now() };
  } catch {
    /* keep the last known version */
  }
  return memo.value;
}

/** Call after any product write (seed, admin edit, sales count update). */
export async function bumpCatalogVersion() {
  const r = redis();
  if (!r) return null;
  const value = String(await r.incr(KEY));
  memo = { value, at: Date.now() };
  return value;
}
