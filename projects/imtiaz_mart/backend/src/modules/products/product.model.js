import mongoose from "mongoose";
import { CATEGORIES } from "./categories.js";

const productSchema = new mongoose.Schema(
  {
    handle: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 }, // URL slug
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, enum: CATEGORIES },
    gender: { type: String, enum: ["men", "women", "unisex"], default: "unisex" },
    style: { type: String, trim: true, maxlength: 40 },
    colour: { type: String, trim: true, maxlength: 40 },
    // Money as integer cents, never a float: 0.1 + 0.2 !== 0.3 in floating point.
    priceCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    compareAtCents: { type: Number, min: 0, validate: Number.isInteger },
    image: { type: String, required: true, maxlength: 60 }, // Unsplash photo id
    sizes: { type: [String], default: undefined },
    // Denormalised counter (docs #15): kept on the product so "best selling" is an indexed sort,
    // not a COUNT over an orders collection on every page view.
    salesCount: { type: Number, default: 0, min: 0 },
    // Units on hand (one count per product, not per size). Never below 0: the order transaction
    // only decrements with the guard {stock: {$gte: qty}} (see orders/order.service.js).
    stock: { type: Number, min: 0, validate: Number.isInteger },
  },
  { timestamps: true, versionKey: false },
);

// --- Indexes: one per (filter + sort) the product list supports ---
// Rule from docs #4 and #5: equality field first (category), then the sort field,
// then _id as a unique tie-breaker so cursor pagination never skips or repeats a row.
// One index serves both directions: {priceCents: 1, _id: 1} is walked backwards for price high→low.
productSchema.index({ category: 1, salesCount: -1, _id: -1 }, { name: "cat_bestselling" });
productSchema.index({ category: 1, createdAt: -1, _id: -1 }, { name: "cat_newest" });
productSchema.index({ category: 1, priceCents: 1, _id: 1 }, { name: "cat_price" });
// Best sellers across every category (no category filter)
productSchema.index({ salesCount: -1, _id: -1 }, { name: "bestselling" });
// Product page lookups and idempotent seeding by handle
productSchema.index({ handle: 1 }, { unique: true, name: "uniq_handle" });

export const Product = mongoose.model("Product", productSchema);
