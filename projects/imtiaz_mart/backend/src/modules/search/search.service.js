import mongoose from "mongoose";
import { cached } from "../../lib/cache.js";
import { HttpError } from "../../lib/httpError.js";
import { getCatalogVersion } from "../products/catalogVersion.js";
import { toPublicProduct } from "../products/product.service.js";
import { SEARCH_INDEX, SYNONYM_MAPPING } from "./searchConfig.js";

const PATHS = ["name", "style", "colour", "category", "gender"];
const DETAIL_PATHS = ["style", "colour", "category", "gender"];
const RESULT_FIELDS = { handle: 1, name: 1, category: 1, gender: 1, style: 1, colour: 1, priceCents: 1, compareAtCents: 1, image: 1, sizes: 1 };
// Bump when the query logic or ranking changes: cached results from the old logic stop being read.
// (catalog version covers data changes; this covers code changes)
const ALGO_VERSION = 3;
const SEARCH_TTL_S = 5 * 60;
const SUGGEST_TTL_S = 10 * 60;
const COUNT_CAP = 1000; // counting stops here ("1000+"): exact counts on huge result sets are wasted work

const products = () => mongoose.connection.db.collection("products");

/** Same text -> same cache key: trim, collapse spaces, lowercase. */
export const normalizeQuery = (q) => q.trim().replace(/\s+/g, " ").toLowerCase();

// Typo tolerance by length: short words with 2 edits match unrelated words ("shades" -> "shoes")
const maxEditsFor = (q) => (q.replace(/\s/g, "").length >= 8 ? 2 : 1);

/**
 * One relevance query combining several matchers (a document's scores add up):
 *  1. exact words + synonyms in the NAME     (boost 4)  "trainers" finds "... sneaker"
 *  2. exact words + synonyms in the details  (boost 2)  colour, style, category, gender
 *  3. autocomplete on the name               (boost 2)  "ashf" finds "Ashford" while typing
 *  4. fuzzy words anywhere                   (boost 1)  "snekers" still finds "sneaker"
 * Atlas can't apply synonyms and fuzzy in the same clause, hence separate clauses.
 * Name matches outrank detail matches ("gray tee": a grey t-shirt beats a grey blazer),
 * and exact matches outrank typo matches.
 */
function searchStage(q, { category, after, before, count }) {
  // Synonyms are matched against the whole query text, so in "gray tee" the word "tee" alone
  // was never expanded to "t-shirt". Adding one clause per word expands every word; the
  // whole-query clause stays for multi-word synonyms like "running shoe". Capped at 5 words.
  const words = [...new Set(q.split(" "))].filter((w) => w.length >= 2).slice(0, 5);
  const perWord = words.length > 1
    ? words.map((w) => ({ text: { query: w, path: "name", synonyms: SYNONYM_MAPPING, score: { boost: { value: 3 } } } }))
    : [];

  return {
    index: SEARCH_INDEX,
    compound: {
      should: [
        { text: { query: q, path: "name", synonyms: SYNONYM_MAPPING, score: { boost: { value: 4 } } } },
        ...perWord,
        { text: { query: q, path: DETAIL_PATHS, synonyms: SYNONYM_MAPPING, score: { boost: { value: 2 } } } },
        { autocomplete: { query: q, path: "name", score: { boost: { value: 2 } } } },
        { text: { query: q, path: PATHS, fuzzy: { maxEdits: maxEditsFor(q), prefixLength: 1, maxExpansions: 50 } } },
      ],
      minimumShouldMatch: 1,
      // filter = must match but doesn't change the score (cheap exact token match)
      ...(category && { filter: [{ equals: { path: "category", value: category } }] }),
    },
    // Relevance first, then best sellers, then _id: a total order, so paging never skips or repeats
    sort: { score: { $meta: "searchScore", order: -1 }, salesCount: -1, _id: 1 },
    ...(after && { searchAfter: after }),
    ...(before && { searchBefore: before }),
    ...(count && { count: { type: "lowerBound", threshold: COUNT_CAP } }),
  };
}

/**
 * Full search with cursor pagination. Atlas returns an opaque "searchSequenceToken" per result;
 * we pass the last one back as searchAfter (next page) or the first as searchBefore (previous page).
 * Same idea as our keyset pagination: the engine jumps to the position, no OFFSET.
 */
export async function search({ q, category, limit, after, before }) {
  const query = normalizeQuery(q);
  const v = await getCatalogVersion();
  const dir = after ? "a" : before ? "b" : "first";
  const key = `search:a${ALGO_VERSION}:v${v}:${category ?? "all"}:${limit}:${dir}:${after ?? before ?? "-"}:${query}`;

  const { value, hit } = await cached(key, SEARCH_TTL_S, async () => {
    let rows, meta;
    try {
      // One round trip: results and the total count together ($$SEARCH_META)
      const [res] = await products()
        .aggregate([
          { $search: searchStage(query, { category, after, before, count: true }) },
          {
            $facet: {
              rows: [
                { $limit: limit + 1 }, // +1 tells us if there's another page
                { $project: { ...RESULT_FIELDS, cursor: { $meta: "searchSequenceToken" } } },
              ],
              meta: [{ $replaceWith: "$$SEARCH_META" }, { $limit: 1 }],
            },
          },
        ], { maxTimeMS: 5000 })
        .toArray();
      rows = res.rows;
      meta = res.meta[0];
    } catch (err) {
      // A tampered cursor token is rejected by Atlas: tell the client, don't 500
      if (cursorProblem(err)) throw new HttpError(400, "INVALID_CURSOR", "This results page is out of date. Search again.");
      throw err;
    }

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    if (before) page.reverse(); // searchBefore returns rows nearest-first; put back in display order
    const hasNext = before ? true : hasMore;
    const hasPrev = before ? hasMore : Boolean(after);
    const total = meta?.count?.lowerBound ?? page.length;

    return {
      query,
      items: page.map((p) => toPublicProduct(p)),
      page: {
        limit,
        nextCursor: hasNext && page.length ? page.at(-1).cursor : null,
        prevCursor: hasPrev && page.length ? page[0].cursor : null,
      },
      total: { value: total, capped: total >= COUNT_CAP },
    };
  });
  return { body: value, cacheHit: hit };
}

/** Search-as-you-type: a few top matches for the dropdown. Cheaper than full search: no count. */
export async function suggest(q) {
  const query = normalizeQuery(q);
  const v = await getCatalogVersion();
  const { value } = await cached(`search:a${ALGO_VERSION}:v${v}:suggest:${query}`, SUGGEST_TTL_S, async () => {
    const rows = await products()
      .aggregate([
        { $search: searchStage(query, {}) },
        { $limit: 6 },
        { $project: { handle: 1, name: 1, category: 1, colour: 1, priceCents: 1, image: 1 } },
      ], { maxTimeMS: 3000 })
      .toArray();
    return {
      query,
      items: rows.map((p) => ({ id: String(p._id), handle: p.handle, name: p.name, category: p.category, colour: p.colour, priceCents: p.priceCents, image: p.image })),
    };
  });
  return value;
}

const cursorProblem = (err) => /searchAfter|searchBefore|sequence ?token|token/i.test(String(err?.message));
