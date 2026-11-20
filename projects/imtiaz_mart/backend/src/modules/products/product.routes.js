import { Router } from "express";
import { z } from "zod";
import { CATEGORIES } from "./categories.js";
import { listProducts, SORTS } from "./product.service.js";

const listSchema = z
  .object({
    category: z.enum(CATEGORIES).optional(),
    sort: z.enum(Object.keys(SORTS)).default("best-selling"),
    limit: z.coerce.number().int().min(1).max(24).default(10),
    after: z.string().max(200).optional(),
    before: z.string().max(200).optional(),
  })
  .strict()
  .refine((q) => !(q.after && q.before), { message: "Send either after or before, not both" });

export const productRouter = Router();

// GET /api/v1/products?category=shoes&sort=price-asc&limit=10&after=<cursor>
productRouter.get("/", async (req, res) => {
  const { body, cacheHit } = await listProducts(listSchema.parse({ ...req.query }));
  // Two cache layers:
  // - Redis (server): shared by every visitor and every API server
  // - Cache-Control (browser, later a CDN): 60 s, then a stale copy for 5 min while it refreshes
  res
    .set("X-Cache", cacheHit ? "HIT" : "MISS") // lets us see the cache working in DevTools
    .set("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
    .json(body);
});
