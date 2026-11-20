// Gives every product a starting stock level. Run: npm run migrate:stock
//
// Additive and idempotent: it only touches products that have NO stock field yet,
// so running it again changes nothing and never resets stock that orders have used.
// Stock = 3..40 units, derived from salesCount so it's deterministic (same result every run).
import mongoose from "mongoose";
import { connectMongo, disconnectMongo } from "../src/db/mongo.js";
import { Product } from "../src/modules/products/product.model.js";

await connectMongo();
const db = mongoose.connection.name;
const missing = await Product.countDocuments({ stock: { $exists: false } });
console.log(`Database "${db}": ${missing} product(s) without a stock level`);

if (missing > 0) {
  // One updateMany with a pipeline: the server computes each value, no per-document round trips
  const r = await Product.updateMany(
    { stock: { $exists: false } },
    [{ $set: { stock: { $add: [3, { $mod: [{ $toInt: "$salesCount" }, 38] }] } } }],
    { timestamps: false, updatePipeline: true }, // Mongoose 9 makes pipeline updates opt-in
  );
  console.log(`Set stock on ${r.modifiedCount} product(s)`);
}

const [s] = await Product.aggregate([{ $group: { _id: null, min: { $min: "$stock" }, max: { $max: "$stock" }, units: { $sum: "$stock" } } }]);
console.log(`Stock now: min ${s?.min}, max ${s?.max}, total units ${s?.units}`);
await disconnectMongo();
