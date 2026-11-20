import assert from "node:assert/strict";
import { test } from "node:test";
import { BloomFilter } from "../src/lib/bloomFilter.js";

test("sizes itself from n and p using the standard formulas", () => {
  const f = new BloomFilter(1_000_000, 0.01);
  assert.equal(f.hashCount, 7);
  assert.ok(Math.abs(f.size - 9_585_059) < 2, `bits = ${f.size}`);
  assert.ok(f.stats().memoryKB < 1200, "1M items at 1% should fit in ~1.2 MB");
});

test("never gives a false negative", () => {
  const f = new BloomFilter(10_000, 0.01);
  const added = Array.from({ length: 10_000 }, (_, i) => `user${i}@example.com`);
  added.forEach((v) => f.add(v));
  for (const v of added) assert.equal(f.mightContain(v), true, v);
});

test("false-positive rate stays near the target", () => {
  const f = new BloomFilter(10_000, 0.01);
  for (let i = 0; i < 10_000; i++) f.add(`user${i}@example.com`);
  let fp = 0;
  const trials = 20_000;
  for (let i = 0; i < trials; i++) if (f.mightContain(`stranger${i}@example.com`)) fp++;
  const rate = fp / trials;
  assert.ok(rate < 0.02, `false-positive rate ${(rate * 100).toFixed(2)}% should be under 2%`);
});
