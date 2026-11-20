import mongoose from "mongoose";

// One order line = a SNAPSHOT of the product at the moment of purchase (name, price, image).
// If the product's price changes tomorrow, this order must still show what the customer paid.
const lineSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    handle: { type: String, required: true },
    name: { type: String, required: true },
    colour: String,
    image: String,
    size: { type: String, required: true },
    qty: { type: Number, required: true, min: 1, max: 10, validate: Number.isInteger },
    unitPriceCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    lineTotalCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    // Sent by the client once per checkout attempt. Same key twice = the same order, not two.
    idempotencyKey: { type: String, required: true, maxlength: 64 },
    items: { type: [lineSchema], validate: (v) => v.length >= 1 && v.length <= 20 },
    subtotalCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    shippingCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    totalCents: { type: Number, required: true, min: 0, validate: Number.isInteger },
    shipping: {
      method: { type: String, enum: ["standard", "express"], required: true },
      firstName: { type: String, required: true, maxlength: 50 },
      lastName: { type: String, required: true, maxlength: 50 },
      line1: { type: String, required: true, maxlength: 120 },
      city: { type: String, required: true, maxlength: 60 },
      postalCode: { type: String, required: true, maxlength: 10 },
      country: { type: String, required: true, maxlength: 40 },
      phone: { type: String, required: true, maxlength: 20 },
    },
    payment: {
      method: { type: String, enum: ["cod"], default: "cod" }, // cash on delivery: no card data touches our server
      status: { type: String, enum: ["pending", "paid"], default: "pending" },
    },
    status: { type: String, enum: ["placed", "shipped", "delivered", "cancelled"], default: "placed" },
  },
  { timestamps: true, versionKey: false },
);

// Consistency (the C in ACID): the money must add up, or the write is rejected
// and the whole transaction rolls back with it.
orderSchema.pre("validate", function () {
  const lines = this.items.reduce((n, l) => n + l.lineTotalCents, 0);
  const lineMath = this.items.every((l) => l.lineTotalCents === l.unitPriceCents * l.qty);
  if (!lineMath || lines !== this.subtotalCents || this.subtotalCents + this.shippingCents !== this.totalCents) {
    this.invalidate("totalCents", "Order totals do not add up");
  }
});

// Idempotency lookup "has this user already sent this key?" and the race guard:
// two requests with the same key can't both insert (the second gets duplicate-key error 11000).
orderSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true, name: "uniq_user_idem" });

export const Order = mongoose.model("Order", orderSchema);

export const orderNumber = (id) => `IM-${String(id).slice(-8).toUpperCase()}`;

export function toPublicOrder(o) {
  return {
    id: String(o._id),
    number: orderNumber(o._id),
    status: o.status,
    items: o.items.map(({ productId, ...l }) => ({ ...l, productId: String(productId) })),
    subtotalCents: o.subtotalCents,
    shippingCents: o.shippingCents,
    totalCents: o.totalCents,
    shipping: o.shipping,
    payment: o.payment,
    createdAt: o.createdAt,
  };
}
