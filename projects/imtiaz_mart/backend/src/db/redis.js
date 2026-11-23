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

// A connection in subscribe mode can only listen, so pub/sub gets its own (a duplicate)
let subscriber = null;

/**
 * Listen on a pub/sub channel. Returns false (and the caller carries on) if Redis is unavailable.
 * node-redis re-subscribes by itself after a reconnect.
 */
export async function subscribe(channel, onMessage) {
  if (!client?.isReady) return false;
  try {
    subscriber = client.duplicate();
    subscriber.on("error", () => {}); // the main client already logs Redis errors
    await subscriber.connect();
    await subscriber.subscribe(channel, onMessage);
    return true;
  } catch (err) {
    console.warn(`Redis: could not subscribe to ${channel}:`, err.message);
    return false;
  }
}

/** Tests only: swap in a fake client. */
export const __setRedisClientForTests = (fake) => {
  client = fake;
};

/** The client only when it can serve commands right now, otherwise null. */
export const redis = () => (client?.isReady ? client : null);

export async function disconnectRedis() {
  if (subscriber?.isOpen) await subscriber.close().catch(() => {});
  if (client?.isOpen) await client.close().catch(() => {});
}
