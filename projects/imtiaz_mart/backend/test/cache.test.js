import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

// The modules read config at import time; give them a harmless test config (no real DB or Redis)
Object.assign(process.env, {
  MONGODB_URI: "mongodb://127.0.0.1:1/unused",
  JWT_ACCESS_SECRET: "a".repeat(40),
  JWT_REFRESH_SECRET: "b".repeat(40),
});
const { __setRedisClientForTests } = await import("../src/db/redis.js");
const { cached, cacheStats } = await import("../src/lib/cache.js");

// In-memory fake with the 3 commands the cache uses
function fakeRedis({ slow = false, broken = false } = {}) {
  const store = new Map();
  const ttls = new Map();
  const delay = () => new Promise((r) => setTimeout(r, slow ? 1000 : 0));
  return {
    isReady: true,
    store,
    ttls,
    async get(k) { await delay(); if (broken) throw new Error("conn reset"); return store.get(k) ?? null; },
    async set(k, v, opts) { await delay(); if (broken) throw new Error("conn reset"); store.set(k, v); ttls.set(k, opts?.expiration?.value); },
    async del(keys) { for (const k of [].concat(keys)) store.delete(k); },
  };
}

let loads;
const loader = (value) => async () => { loads++; return value; };
beforeEach(() => { loads = 0; });

test("miss loads from the DB and stores it with a TTL; next call is a hit", async () => {
  const r = fakeRedis();
  __setRedisClientForTests(r);
  const first = await cached("k1", 300, loader({ a: 1 }));
  await new Promise((res) => setTimeout(res, 10)); // background write
  const second = await cached("k1", 300, loader({ a: 2 }));
  assert.deepEqual(first, { value: { a: 1 }, hit: false });
  assert.deepEqual(second, { value: { a: 1 }, hit: true }, "served from cache, loader not called again");
  assert.equal(loads, 1);
  assert.equal(r.ttls.get("k1"), 300);
});

test("fail open: no Redis at all -> loads from the DB", async () => {
  __setRedisClientForTests(null);
  assert.deepEqual(await cached("k2", 60, loader("db")), { value: "db", hit: false });
});

test("fail open: Redis errors -> loads from the DB", async () => {
  __setRedisClientForTests(fakeRedis({ broken: true }));
  assert.deepEqual(await cached("k3", 60, loader("db")), { value: "db", hit: false });
});

test("fail open: Redis slower than 400 ms -> gives up and loads from the DB", async () => {
  __setRedisClientForTests(fakeRedis({ slow: true }));
  const t = performance.now();
  const r = await cached("k4", 60, loader("db"));
  const ms = performance.now() - t;
  assert.equal(r.value, "db");
  assert.ok(ms < 700, `took ${Math.round(ms)} ms; should stop waiting at ~400 ms`);
});

test("corrupt cache entry is treated as a miss", async () => {
  const r = fakeRedis();
  r.store.set("k5", "{not json");
  __setRedisClientForTests(r);
  assert.deepEqual(await cached("k5", 60, loader("fresh")), { value: "fresh", hit: false });
});

test("loader errors are thrown and never cached", async () => {
  const r = fakeRedis();
  __setRedisClientForTests(r);
  await assert.rejects(cached("k6", 60, async () => { throw new Error("not found"); }), /not found/);
  assert.equal(r.store.has("k6"), false);
  assert.ok(cacheStats().misses >= 1);
});
