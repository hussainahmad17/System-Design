import mongoose from "mongoose";
import { HttpError } from "../../lib/httpError.js";
import { Product } from "../products/product.model.js";
import { Order, orderNumber, toPublicOrder } from "./order.model.js";

// ---------- Reading orders (used by the support chatbot's MCP server) ----------
// Every read is scoped by userId: a customer can only ever see their own orders.

const MAX_LIST = 10;
// How far back "find my order by number" looks. A bound, so one user can never cause a big read.
const NUMBER_LOOKUP_WINDOW = 100;

/** The user's newest orders. Uses the user_recent index ({userId, createdAt}). */
export async function listOrdersForUser(userId, limit = 5) {
  const rows = await Order.find({ userId })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, MAX_LIST))
    .lean();
  return rows.map(toPublicOrder);
}

/**
 * One order by its number (e.g. "SC-32833A06"), or null.
 * The number is the END of the order's _id, so no index can look it up directly.
 * We read the user's recent orders (indexed, bounded) and compare in memory instead.
 */
export async function getOrderForUser(userId, number) {
  const rows = await Order.find({ userId }).sort({ createdAt: -1 }).limit(NUMBER_LOOKUP_WINDOW).lean();
  const match = rows.find((o) => orderNumber(o._id) === number);
  return match ? toPublicOrder(match) : null;
}

// Shipping rules live on the server. The client shows the same numbers, but never decides them.
const SHIPPING_CENTS = { standard: 15_00, express: 35_00 };
const FREE_STANDARD_FROM_CENTS = 300_00;
export const shippingCents = (method, subtotal) =>
  method === "standard" && subtotal >= FREE_STANDARD_FROM_CENTS ? 0 : SHIPPING_CENTS[method];

// The ACID settings for an order:
// - snapshot read concern: every read in the transaction sees ONE consistent point in time (Isolation)
// - majority + journal write concern: commit returns only after most replicas wrote it to disk (Durability)
const TXN_OPTIONS = {
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority", j: true },
  maxCommitTimeMS: 5000,
};

/**
 * Place an order as ONE transaction (all or nothing):
 *   1. read the products (current prices, valid sizes)
 *   2. take the stock for every product, guarded by stock >= qty
 *   3. add to salesCount (the "best selling" sort)
 *   4. insert the order
 * Any failure (out of stock, bad size, totals don't add up, crash) rolls back ALL of it:
 * no stock disappears without an order, and no order exists without its stock.
 *
 * @returns {{ order: object, replayed: boolean }} replayed = this key already made an order
 */
export async function placeOrder({ userId, idempotencyKey, items, shippingMethod, address }) {
  // Retry of a request that already succeeded (double click, timeout + retry): return that order
  const existing = await Order.findOne({ userId, idempotencyKey }).lean();
  if (existing) return { order: toPublicOrder(existing), replayed: true };

  const session = await mongoose.startSession();
  try {
    let created;
    // withTransaction retries the whole callback on transient errors, e.g. a WRITE CONFLICT
    // (another order changed the same product's stock at the same moment). So the callback
    // must be safe to run twice: it only writes through the session, and the session undoes
    // everything on abort.
    await session.withTransaction(async () => {
      created = await runOrderTransaction(session, { userId, idempotencyKey, items, shippingMethod, address });
    }, TXN_OPTIONS);
    return { order: toPublicOrder(created), replayed: false };
  } catch (err) {
    // Two identical requests raced past the check above: the unique index let only one insert.
    if (err?.code === 11000) {
      const winner = await Order.findOne({ userId, idempotencyKey }).lean();
      if (winner) return { order: toPublicOrder(winner), replayed: true };
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

async function runOrderTransaction(session, { userId, idempotencyKey, items, shippingMethod, address }) {
  // Same product + size twice in the request -> one line
  const lines = new Map();
  for (const it of items) {
    const key = `${it.productId}:${it.size}`;
    const prev = lines.get(key);
    lines.set(key, { ...it, qty: (prev?.qty ?? 0) + it.qty });
  }
  // Stock is per product, so add up the quantity across sizes
  const qtyByProduct = new Map();
  for (const l of lines.values()) qtyByProduct.set(l.productId, (qtyByProduct.get(l.productId) ?? 0) + l.qty);
  const ids = [...qtyByProduct.keys()];

  // 1. ONE query for every product in the cart ($in), not one query per line (no N+1)
  const products = await Product.find({ _id: { $in: ids } })
    .select("handle name colour image priceCents sizes stock")
    .session(session)
    .lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const problems = {};
  for (const l of lines.values()) {
    const p = byId.get(l.productId);
    if (!p) problems[l.productId] = "This product is no longer available";
    else if (!p.sizes?.includes(l.size)) problems[l.productId] = `Size ${l.size} doesn't exist for this product`;
  }
  if (Object.keys(problems).length) throw new HttpError(409, "CART_INVALID", "Some items in your cart changed. Please review them.", problems);

  // Friendly per-item message ("Only 2 left"), from this transaction's snapshot
  const short = {};
  for (const [id, want] of qtyByProduct) {
    const have = byId.get(id).stock ?? 0;
    if (have < want) short[id] = have > 0 ? `Only ${have} left` : "Sold out";
  }
  if (Object.keys(short).length) throw new HttpError(409, "OUT_OF_STOCK", "Some items don't have enough stock.", short);

  // 2 + 3. Take stock and count the sale: ONE round trip for all products.
  // The filter {stock: {$gte: qty}} is the guard: the update only matches if enough stock is left,
  // so stock can never go negative. If another order changed this product after our snapshot,
  // MongoDB raises a write conflict and withTransaction re-runs us with fresh data.
  const result = await Product.bulkWrite(
    ids.map((id) => ({
      updateOne: {
        filter: { _id: id, stock: { $gte: qtyByProduct.get(id) } },
        update: { $inc: { stock: -qtyByProduct.get(id), salesCount: qtyByProduct.get(id) } },
      },
    })),
    { session, ordered: true },
  );

  if (result.matchedCount !== ids.length) {
    // Safety net. Throwing ABORTS the transaction: stock already taken for the other
    // products in this cart is put back automatically (Atomicity).
    throw new HttpError(409, "OUT_OF_STOCK", "Some items just sold out. Please review your cart.");
  }

  // 4. Insert the order with SERVER prices (the cart's prices are only a hint from the browser)
  const orderItems = [...lines.values()].map((l) => {
    const p = byId.get(l.productId);
    return {
      productId: p._id,
      handle: p.handle,
      name: p.name,
      colour: p.colour,
      image: p.image,
      size: l.size,
      qty: l.qty,
      unitPriceCents: p.priceCents,
      lineTotalCents: p.priceCents * l.qty,
    };
  });
  const subtotalCents = orderItems.reduce((n, l) => n + l.lineTotalCents, 0);
  const ship = shippingCents(shippingMethod, subtotalCents);

  const [order] = await Order.create(
    [{
      userId,
      idempotencyKey,
      items: orderItems,
      subtotalCents,
      shippingCents: ship,
      totalCents: subtotalCents + ship,
      shipping: { method: shippingMethod, ...address },
    }],
    { session },
  );
  return order.toObject();
}
