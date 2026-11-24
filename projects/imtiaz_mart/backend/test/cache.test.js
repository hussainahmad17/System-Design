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

// ---------- Single-flight (cache stampede protection) ----------
const slowLoader = (value, ms = 50) => async () => { loads++; await new Promise((r) => setTimeout(r, ms)); return value; };

test("stampede: 100 simultaneous misses on one key -> 1 DB load, everyone gets the value", async () => {
  const r = fakeRedis();
  __setRedisClientForTests(r);
  const before = cacheStats().coalesced;
  const results = await Promise.all(Array.from({ length: 100 }, () => cached("sf1", 60, slowLoader("page1"))));
  assert.equal(loads, 1, "only the first request queried the DB");
  assert.ok(results.every((x) => x.value === "page1" && x.hit === false));
  assert.equal(cacheStats().coalesced - before, 99);
  await new Promise((res) => setTimeout(res, 10));
  assert.equal(r.store.get("sf1"), JSON.stringify("page1"), "written to Redis once");
});

test("Redis down: 50 simultaneous requests -> 1 DB load", async () => {
  __setRedisClientForTests(null);
  await Promise.all(Array.from({ length: 50 }, () => cached("sf2", 60, slowLoader("db"))));
  assert.equal(loads, 1);
});

test("a failed load is shared by its waiters, then the next request retries", async () => {
  __setRedisClientForTests(fakeRedis());
  const failing = async () => { loads++; await new Promise((r) => setTimeout(r, 20)); throw new Error("db down"); };
  const settled = await Promise.allSettled(Array.from({ length: 10 }, () => cached("sf3", 60, failing)));
  assert.equal(loads, 1);
  assert.ok(settled.every((s) => s.status === "rejected"));
  assert.deepEqual(await cached("sf3", 60, slowLoader("ok", 1)), { value: "ok", hit: false }, "not stuck on the error");
  assert.equal(loads, 2);
});

test("different keys load independently", async () => {
  __setRedisClientForTests(fakeRedis());
  await Promise.all([cached("sfA", 60, slowLoader("a")), cached("sfB", 60, slowLoader("b"))]);
  assert.equal(loads, 2);
});

test("loader returning a Mongoose-style Query (a thenable that runs on every .then) is executed once", async () => {
  __setRedisClientForTests(fakeRedis());
  // Like Product.countDocuments(): not a Promise; each .then() executes it; a second execution throws
  const queryLike = () => {
    let executed = false;
    return {
      then(onOk, onErr) {
        if (executed) return Promise.reject(new Error("Query was already executed")).then(onOk, onErr);
        executed = true; loads++;
        return Promise.resolve(42).then(onOk, onErr);
      },
    };
  };
  const results = await Promise.all([cached("sfQ", 60, queryLike), cached("sfQ", 60, queryLike)]);
  assert.deepEqual(results.map((r) => r.value), [42, 42]);
  assert.equal(loads, 1);
});
