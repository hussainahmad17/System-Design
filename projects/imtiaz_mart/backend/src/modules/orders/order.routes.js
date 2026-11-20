import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { HttpError } from "../../lib/httpError.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { placeOrder } from "./order.service.js";

// The client sends only WHAT it wants (product, size, qty). Never prices or totals:
// those come from the database inside the transaction.
const placeOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid product id"),
        size: z.string().trim().min(1).max(20),
        qty: z.number().int().min(1).max(10),
      }),
    )
    .min(1, "Your cart is empty")
    .max(20, "Too many different items in one order"),
  shippingMethod: z.enum(["standard", "express"]),
  address: z.object({
    firstName: z.string().trim().min(1, "Required").max(50),
    lastName: z.string().trim().min(1, "Required").max(50),
    line1: z.string().trim().min(3, "Enter your street address").max(120),
    city: z.string().trim().min(2, "Required").max(60),
    postalCode: z.string().trim().regex(/^[0-9A-Za-z \-]{3,10}$/, "Enter a valid postal code"),
    country: z.enum(["Pakistan", "United Arab Emirates", "United Kingdom", "United States"]),
    phone: z.string().trim().regex(/^\+?[0-9 ()\-]{7,20}$/, "Enter a valid phone number"),
  }),
});

const idempotencyKeySchema = z.uuid();

const orderLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Too many order attempts. Try again in a few minutes." } },
});

export const orderRouter = Router();

// POST /api/v1/orders   header: Idempotency-Key: <uuid made once per checkout>
orderRouter.post("/", orderLimit, requireAuth, async (req, res) => {
  const key = idempotencyKeySchema.safeParse(req.get("idempotency-key"));
  if (!key.success) throw new HttpError(400, "IDEMPOTENCY_KEY_REQUIRED", "Missing or invalid Idempotency-Key header");
  const input = placeOrderSchema.parse(req.body);

  const { order, replayed } = await placeOrder({ userId: req.auth.userId, idempotencyKey: key.data, ...input });
  // 201 = created now; 200 = this key already made this order (safe retry)
  res.status(replayed ? 200 : 201).json({ order });
});
