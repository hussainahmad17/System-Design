import { Router } from "express";
import { limiter } from "../../lib/rateLimit.js";
import { z } from "zod";
import { CATEGORIES } from "../products/categories.js";
import { search, suggest } from "./search.service.js";

// Search costs more than a product list, so it has its own limits.
// Suggest is higher: one is sent per pause in typing (the UI debounces and cancels stale ones).
const searchLimit = (name, limit) => limiter(name, limit, 60_000, "Too many searches. Try again in a minute.");

const q = z.string().trim().min(2, "Type at least 2 characters").max(80, "Search is too long");

const searchSchema = z
  .object({
    q,
    category: z.enum(CATEGORIES).optional(),
    limit: z.coerce.number().int().min(1).max(24).default(10),
    after: z.string().max(500).optional(),
    before: z.string().max(500).optional(),
  })
  .strict()
  .refine((v) => !(v.after && v.before), { message: "Send either after or before, not both" });

export const searchRouter = Router();

// GET /api/v1/search?q=black+sneakers&category=shoes&after=<token>
searchRouter.get("/", searchLimit("search", 60), async (req, res) => {
  const { body, cacheHit } = await search(searchSchema.parse({ ...req.query }));
  res.set("X-Cache", cacheHit ? "HIT" : "MISS").set("Cache-Control", "public, max-age=60").json(body);
});

// GET /api/v1/search/suggest?q=snea
searchRouter.get("/suggest", searchLimit("suggest", 120), async (req, res) => {
  const { q: query } = z.object({ q }).strict().parse({ ...req.query });
  res.set("Cache-Control", "public, max-age=300").json(await suggest(query));
});
