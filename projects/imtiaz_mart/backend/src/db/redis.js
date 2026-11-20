import { createClient } from "redis";
import { env } from "../config/env.js";

// One shared Redis connection for the whole process (Redis multiplexes commands on it,
// so unlike MongoDB we don't need a pool).
let client = null;

export async function connectRedis() {
  if (!env.REDIS_URL) {
    console.log("Redis: REDIS_URL not set, cache disabled (reading from MongoDB)");
    return;
  }

  client = createClient({
    url: env.REDIS_URL,
    socket: {
      connectTimeout: 5000,
      // Keep retrying in the background with backoff (0.2 s, 0.4 s ... capped at 5 s)
      reconnectStrategy: (retries) => Math.min(retries * 200, 5000),
    },
    // While disconnected, fail commands immediately instead of queueing them.
    // A queued GET would make the user wait; failing lets the cache fall back to MongoDB.
    disableOfflineQueue: true,
  });

  // Without an error listener, a network blip would crash the process
  let lastLog = 0;
  client.on("error", (err) => {
    if (Date.now() - lastLog > 30_000) {
      console.warn("Redis error (cache bypassed until it recovers):", err.message);
      lastLog = Date.now();
    }
  });
  client.on("ready", () => console.log("Redis connected, cache enabled"));

  try {
    await client.connect();
  } catch (err) {
    // Not fatal: the store works without a cache, just slower
    console.warn("Redis: could not connect, starting without cache:", err.message);
  }
}

/** Tests only: swap in a fake client. */
export const __setRedisClientForTests = (fake) => {
  client = fake;
};

/** The client only when it can serve commands right now, otherwise null. */
export const redis = () => (client?.isReady ? client : null);

export async function disconnectRedis() {
  if (client?.isOpen) await client.close().catch(() => {});
}
