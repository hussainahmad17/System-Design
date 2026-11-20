// Creates (or updates) the Atlas Search index and the synonym list. Run: npm run search:setup
// Safe to run again: synonyms are upserted by _id, the index is updated in place. Deletes nothing.
import mongoose from "mongoose";
import { connectMongo, disconnectMongo } from "../src/db/mongo.js";
import {
  SEARCH_INDEX,
  SEARCH_INDEX_DEFINITION,
  SYNONYM_COLLECTION,
  SYNONYMS,
} from "../src/modules/search/searchConfig.js";

await connectMongo();
const db = mongoose.connection.db;
console.log(`Database "${db.databaseName}"`);

// 1. Synonyms (one batched write)
const syn = await db.collection(SYNONYM_COLLECTION).bulkWrite(
  SYNONYMS.map((doc) => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } })),
  { ordered: false },
);
console.log(`Synonyms: ${syn.upsertedCount} added, ${syn.modifiedCount} updated, ${SYNONYMS.length} groups total`);

// 2. Search index: create if missing, otherwise update the definition
const products = db.collection("products");
const existing = (await products.listSearchIndexes(SEARCH_INDEX).toArray())[0];
if (existing) {
  await products.updateSearchIndex(SEARCH_INDEX, SEARCH_INDEX_DEFINITION);
  console.log(`Index "${SEARCH_INDEX}": definition updated, rebuilding`);
} else {
  await products.createSearchIndex({ name: SEARCH_INDEX, definition: SEARCH_INDEX_DEFINITION });
  console.log(`Index "${SEARCH_INDEX}": created, building`);
}

// 3. Wait until it can serve queries (Atlas builds it in the background)
const started = Date.now();
for (;;) {
  const idx = (await products.listSearchIndexes(SEARCH_INDEX).toArray())[0];
  const synStatus = idx?.synonymMappingStatus ?? "n/a";
  process.stdout.write(`\r  status=${idx?.status} queryable=${idx?.queryable} synonyms=${synStatus} (${Math.round((Date.now() - started) / 1000)}s)   `);
  if (idx?.queryable && idx.status === "READY" && synStatus !== "BUILDING") break;
  if (idx?.status === "FAILED") {
    console.error("\nIndex build failed:", JSON.stringify(idx, null, 2));
    process.exit(1);
  }
  if (Date.now() - started > 5 * 60_000) {
    console.error("\nStill building after 5 minutes. Check Atlas > Search, then re-run.");
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 3000));
}
console.log("\nSearch index ready.");
await disconnectMongo();
