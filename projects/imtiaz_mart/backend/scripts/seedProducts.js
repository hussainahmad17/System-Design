// Seeds 500 products (5 categories × 100). Run: npm run seed:products
//
// Safe to run many times (idempotent): each product is upserted by its unique handle,
// so a second run updates the same 500 documents instead of adding 500 more.
// It never deletes anything.
import { connectMongo, disconnectMongo } from "../src/db/mongo.js";
import { connectRedis, disconnectRedis } from "../src/db/redis.js";
import { bumpCatalogVersion } from "../src/modules/products/catalogVersion.js";
import { Product } from "../src/modules/products/product.model.js";
import { buildSeedProducts } from "./productSeedData.js";
import mongoose from "mongoose";

await Promise.all([connectMongo(), connectRedis()]);
console.log(`Seeding into database "${mongoose.connection.name}"`);
await Product.createIndexes();

const products = buildSeedProducts();
const started = performance.now();

// Batch write (docs #13): one round trip for all 500 instead of 500 separate inserts
const result = await Product.bulkWrite(
  products.map(({ createdAt, ...fields }) => ({
    updateOne: {
      filter: { handle: fields.handle },
      update: { $set: { ...fields, updatedAt: new Date() }, $setOnInsert: { createdAt } },
      upsert: true,
    },
  })),
  // timestamps: false -> keep our spread-out createdAt dates (the "Newest" sort needs them)
  { ordered: false, timestamps: false },
);

const ms = Math.round(performance.now() - started);
console.log(`Done in ${ms} ms: ${result.upsertedCount} inserted, ${result.modifiedCount} updated, ${products.length} total in seed`);
for (const c of await Product.aggregate([{ $group: { _id: "$category", n: { $sum: 1 } } }, { $sort: { _id: 1 } }])) {
  console.log(`  ${c._id}: ${c.n}`);
}

// Products changed: bump the catalog version so every cached product page becomes stale at once
const version = await bumpCatalogVersion();
console.log(version ? `Cache invalidated: catalog version is now ${version}` : "Redis not connected: product cache not invalidated (entries expire within 10 minutes)");

await Promise.all([disconnectMongo(), disconnectRedis()]);
