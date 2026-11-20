import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectMongo, disconnectMongo } from "./db/mongo.js";
import { connectRedis, disconnectRedis } from "./db/redis.js";
import { warmUpIdentityIndex } from "./modules/auth/identityIndex.js";
import { Product } from "./modules/products/product.model.js";
import { User } from "./modules/users/user.model.js";

// Startup order matters:
// 1. connect to MongoDB
// 2. make sure the unique indexes exist (idempotent; a no-op if they already do)
// 3. load the bloom filters (an empty filter would say "free" for taken emails)
// 4. only then accept traffic
async function start() {
  await Promise.all([connectMongo(), connectRedis()]); // Redis failing is not fatal
  await Promise.all([User.createIndexes(), Product.createIndexes()]);
  await warmUpIdentityIndex();

  const server = createApp().listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
  // Don't let slow or stuck clients hold connections open forever
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;

  // Graceful shutdown: finish in-flight requests, then close the DB pool
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await Promise.all([disconnectMongo(), disconnectRedis()]);
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref(); // give up after 10 s
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((err) => {
  console.error("Failed to start:", err.message);
  process.exit(1);
});
