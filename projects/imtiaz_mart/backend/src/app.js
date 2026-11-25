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
import { chatRouter } from "./modules/chat/chat.routes.js";
import { orderRouter } from "./modules/orders/order.routes.js";
import { productRouter } from "./modules/products/product.routes.js";
import { searchRouter } from "./modules/search/search.routes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  // Behind Nginx: TRUST_PROXY=1, so req.ip (and every rate limit) sees the real client,
  // not 127.0.0.1. Otherwise one person's failed logins would lock out everyone.
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(helmet()); // security headers
  app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: true })); // credentials: allow the refresh cookie
  app.use(express.json({ limit: "10kb" })); // auth bodies are tiny; cap them
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    // port + pid: shows WHICH of the API processes answered (useful behind the load balancer)
    res.json({ status: "ok", port: env.PORT, pid: process.pid, db: mongoState(), cache: cacheStats(), identityIndex: identityIndexStats() });
  });

  // Versioned REST API: /api/v2 can change shapes later without breaking old clients
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/products", productRouter);
  app.use("/api/v1/search", searchRouter);
  app.use("/api/v1/orders", orderRouter);
  app.use("/api/v1/chat", chatRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
