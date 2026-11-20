import mongoose from "mongoose";
import { cached } from "../../lib/cache.js";
import { HttpError } from "../../lib/httpError.js";
import { getCatalogVersion } from "./catalogVersion.js";
import { Product } from "./product.model.js";

// Each sort = one field + direction, always with _id as the tie-breaker (same direction).
// Every sort has a matching compound index (see product.model.js).
export const SORTS = {
  "best-selling": { field: "salesCount", dir: -1 },
  newest: { field: "createdAt", dir: -1 },
  "price-asc": { field: "priceCents", dir: 1 },
  "price-desc": { field: "priceCents", dir: -1 },
};

// Only what a product card needs (docs #1: don't select *). The sort field is included
// because the cursor is built from it.
const LIST_FIELDS = "handle name category gender style colour priceCents compareAtCents image sizes salesCount createdAt";

// ---------- Cursor encoding ----------
// The cursor is the (sort value, _id) of the last row the client saw, base64url-encoded.
// Opaque to the client: it just sends it back. The sort name is inside, so a cursor
// from one sort can't be replayed against another.
function encodeCursor(sort, doc) {
  const value = doc[SORTS[sort].field];
  const raw = [sort, value instanceof Date ? value.toISOString() : value, String(doc._id)];
  return Buffer.from(JSON.stringify(raw)).toString("base64url");
}

function decodeCursor(sort, cursor) {
  try {
    const [s, value, id] = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (s !== sort || !mongoose.isValidObjectId(id)) throw new Error("mismatch");
    const field = SORTS[sort].field;
    const v = field === "createdAt" ? new Date(value) : Number(value);
    if (field === "createdAt" ? Number.isNaN(v.getTime()) : !Number.isFinite(v)) throw new Error("bad value");
    return { value: v, id: new mongoose.Types.ObjectId(id) };
  } catch {
    throw new HttpError(400, "INVALID_CURSOR", "This page link is invalid or out of date. Go back to the first page.");
  }
}

/**
 * Keyset (cursor) pagination, docs #5.
 * "Rows after (v, id)" in sort order:  field < v  OR  (field = v AND _id < id)   for descending.
 * The DB seeks straight to that point in the compound index and reads limit+1 entries,
 * so page 1 and page 10 cost the same. OFFSET would read and throw away all earlier rows.
 */
function seekFilter({ field, dir }, { value, id }, forward) {
  const op = (dir === -1) === forward ? "$lt" : "$gt";
  return { $or: [{ [field]: { [op]: value } }, { [field]: value, _id: { [op]: id } }] };
}

/**
 * @param {{category?: string, sort: keyof SORTS, limit: number, after?: string, before?: string}} q
 */
// Cache lifetimes. Short enough that a missed invalidation heals itself quickly.
const PAGE_TTL_S = 5 * 60;
const COUNT_TTL_S = 10 * 60;

/**
 * Cached product list. Returns the API body plus whether the page came from Redis.
 * @param {{category?: string, sort: keyof SORTS, limit: number, after?: string, before?: string}} q
 */
export async function listProducts(q) {
  const cursor = q.after ?? q.before;
  if (cursor) decodeCursor(q.sort, cursor); // reject bad cursors BEFORE touching the cache

  const v = await getCatalogVersion();
  const scope = q.category ?? "all";
  const dir = q.after ? "a" : q.before ? "b" : "first";
  // Key = every input that changes the answer. Same inputs -> same key -> shared by all visitors.
  const pageKey = `products:v${v}:page:${scope}:${q.sort}:${q.limit}:${dir}:${cursor ?? "-"}`;
  const countKey = `products:v${v}:count:${scope}`;

  const [page, count] = await Promise.all([
    cached(pageKey, PAGE_TTL_S, () => loadPage(q)),
    // Cached on its own: an uncached page still skips this second query
    cached(countKey, COUNT_TTL_S, () => Product.countDocuments(q.category ? { category: q.category } : {})),
  ]);

  return { body: { ...page.value, total: count.value }, cacheHit: page.hit };
}

/** The MongoDB side: one indexed keyset query. */
async function loadPage({ category, sort, limit, after, before }) {
  const spec = SORTS[sort];
  const base = category ? { category } : {};
  const cursor = after ?? before;
  const forward = !before; // "before" walks backwards to build the previous page

  const filter = cursor ? { ...base, ...seekFilter(spec, decodeCursor(sort, cursor), forward) } : base;
  const d = forward ? spec.dir : -spec.dir;

  const rows = await Product.find(filter)
    .sort({ [spec.field]: d, _id: d })
    .limit(limit + 1) // one extra row tells us whether another page exists, without a COUNT
    .select(LIST_FIELDS)
    .lean();

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  if (!forward) page.reverse(); // walked backwards; put back in display order

  const hasNext = forward ? hasMore : true;
  const hasPrev = forward ? Boolean(after) : hasMore;

  return {
    items: page.map(toPublicProduct),
    page: {
      limit,
      nextCursor: hasNext && page.length ? encodeCursor(sort, page.at(-1)) : null,
      prevCursor: hasPrev && page.length ? encodeCursor(sort, page[0]) : null,
    },
  };
}

export function toPublicProduct(p) {
  return {
    id: String(p._id),
    handle: p.handle,
    name: p.name,
    category: p.category,
    gender: p.gender,
    style: p.style,
    colour: p.colour,
    priceCents: p.priceCents,
    ...(p.compareAtCents && { compareAtCents: p.compareAtCents }),
    image: p.image,
    sizes: p.sizes,
  };
}
