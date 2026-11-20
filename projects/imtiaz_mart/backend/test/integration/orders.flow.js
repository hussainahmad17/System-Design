// ACID checks for placing an order, against a real MongoDB TEST database (Atlas replica set).
// Run: npm run test:integration
//
// Safety: refuses to run unless the database name ends with "_test".
// It creates 2 throwaway products and deletes only those, plus the orders it made (by _id).
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";

function testUri() {
  if (process.env.TEST_MONGODB_URI) return process.env.TEST_MONGODB_URI;
  const m = (process.env.MONGODB_URI ?? "").match(/^(mongodb(?:\+srv)?:\/\/[^/?]+)(\/[^?]*)?(\?.*)?$/);
  if (!m) {
    console.error("Set MONGODB_URI (or TEST_MONGODB_URI) in .env.");
    process.exit(1);
  }
  return `${m[1]}/imtiaz_mart_test${m[3] ?? ""}`;
}
process.env.MONGODB_URI = testUri();

const { connectMongo, disconnectMongo } = await import("../../src/db/mongo.js");
const { createApp } = await import("../../src/app.js");
const { signAccessToken } = await import("../../src/lib/tokens.js");
const { Product } = await import("../../src/modules/products/product.model.js");
const { Order } = await import("../../src/modules/orders/order.model.js");
const { placeOrder } = await import("../../src/modules/orders/order.service.js");

await connectMongo();
const dbName = mongoose.connection.name;
if (!dbName.endsWith("_test")) {
  console.error(`Refusing to run: connected database "${dbName}" does not end with _test.`);
  await disconnectMongo();
  process.exit(1);
}
await Promise.all([Product.createIndexes(), Order.createIndexes()]);

const tag = Date.now().toString(36);
const userId = new mongoose.Types.ObjectId(); // a token is enough: requireAuth doesn't query users
const token = signAccessToken({ _id: userId, role: "customer" });
const base = (h, extra) => ({ handle: `zz-test-${h}-${tag}`, name: `Test ${h}`, category: "watches", colour: "Black", image: "1523170335258-f5ed11844a49", sizes: ["One size"], salesCount: 0, ...extra });
const [jacket, watch] = await Product.create([
  base("jacket", { category: "leather-jackets", priceCents: 450_00, sizes: ["M", "L"], stock: 3 }),
  base("watch", { priceCents: 25_00, stock: 1 }),
]);

const server = createApp().listen(0);
const url = `http://localhost:${server.address().port}/api/v1/orders`;
const address = { firstName: "Ali", lastName: "Khan", line1: "12 Mall Road", city: "Lahore", postalCode: "54000", country: "Pakistan", phone: "+92 300 1234567" };
const line = (p, qty, size = "One size") => ({ productId: String(p._id), size, qty });

async function order(items, key = randomUUID(), shippingMethod = "standard") {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}`, "idempotency-key": key },
    body: JSON.stringify({ items, shippingMethod, address }),
  });
  return { status: res.status, json: await res.json() };
}
const stockOf = async (p) => (await Product.findById(p._id).select("stock salesCount").lean());
const step = (name) => console.log(`  ✔ ${name}`);

try {
  console.log(`Running against ${dbName}`);

  // ---- Happy path: server prices, totals, stock and salesCount move together
  const key1 = randomUUID();
  let r = await order([line(jacket, 1, "M")], key1);
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.equal(r.json.order.totalCents, 450_00 + 0, "free standard shipping over 300");
  let j = await stockOf(jacket);
  assert.deepEqual([j.stock, j.salesCount], [2, 1]);
  step(`order placed ${r.json.order.number}: stock 3 -> 2, salesCount 0 -> 1, total from server prices`);

  // ---- Idempotency: same key again = same order, no second stock change
  r = await order([line(jacket, 1, "M")], key1);
  assert.equal(r.status, 200);
  j = await stockOf(jacket);
  assert.equal(j.stock, 2);
  assert.equal(await Order.countDocuments({ userId }), 1);
  step("retry with the same Idempotency-Key: 200, same order, stock untouched");

  // ---- Consistency: business rule "enough stock" blocks the order
  r = await order([line(jacket, 1, "L"), line(watch, 2)]);
  assert.equal(r.status, 409);
  assert.equal(r.json.error.code, "OUT_OF_STOCK");
  assert.equal(r.json.error.details[String(watch._id)], "Only 1 left");
  assert.equal((await stockOf(jacket)).stock, 2);
  step("cart with too many watches: 409 'Only 1 left', jacket stock unchanged");

  // ---- Atomicity: stock is taken FIRST, then the order insert fails -> stock must come back.
  // A 65-char key passes every check before the writes but fails the Order schema (max 64).
  const before = await stockOf(jacket);
  await assert.rejects(
    placeOrder({ userId, idempotencyKey: "x".repeat(65), items: [line(jacket, 2, "M")], shippingMethod: "standard", address }),
    /idempotencyKey|validation/i,
  );
  const after = await stockOf(jacket);
  assert.deepEqual([after.stock, after.salesCount], [before.stock, before.salesCount]);
  step(`atomicity: stock was decremented, then the order insert failed -> rolled back (stock still ${after.stock})`);

  // ---- Isolation: 6 buyers race for the LAST watch at the same moment
  const race = await Promise.all(Array.from({ length: 6 }, () => order([line(watch, 1)])));
  const codes = race.map((x) => x.status).sort();
  assert.deepEqual(codes, [201, 409, 409, 409, 409, 409], JSON.stringify(codes));
  const w = await stockOf(watch);
  assert.deepEqual([w.stock, w.salesCount], [0, 1]);
  step(`isolation: 6 parallel buyers for 1 watch -> exactly 1 order, 5 'sold out', stock 0 (never negative)`);

  // ---- Durability: the committed order is readable from a fresh query (written with w:majority, j:true)
  const saved = await Order.find({ userId }).lean();
  assert.equal(saved.length, 2);
  step("durability: both committed orders are stored (commit waited for majority + journal)");

  // ---- Validation
  r = await order([line(jacket, 1, "XXL")]);
  assert.equal(r.json.error.code, "CART_INVALID");
  const noKey = await fetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: "{}" });
  assert.equal(noKey.status, 400);
  step("invalid size -> CART_INVALID; missing Idempotency-Key -> 400");

  console.log("All order (ACID) checks passed.");
} finally {
  // Only what this test created
  await Order.deleteMany({ userId });
  await Product.deleteMany({ _id: { $in: [jacket._id, watch._id] } });
  server.close();
  await disconnectMongo();
}
