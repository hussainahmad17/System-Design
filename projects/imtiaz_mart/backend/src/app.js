import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { mongoState } from "./db/mongo.js";
import { cacheStats } from "./lib/cache.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { identityIndexStats } from "./modules/auth/identityIndex.js";
import { productRouter } from "./modules/products/product.routes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  // Behind Nginx later: set to 1 so rate limits see the real client IP from X-Forwarded-For
  app.set("trust proxy", false);

  app.use(helmet()); // security headers
  app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true })); // credentials: allow the refresh cookie
  app.use(express.json({ limit: "10kb" })); // auth bodies are tiny; cap them
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", db: mongoState(), cache: cacheStats(), identityIndex: identityIndexStats() });
  });

  // Versioned REST API: /api/v2 can change shapes later without breaking old clients
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/products", productRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
