import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "../config/env.js";

// Reject query filters with unknown fields instead of silently ignoring them
mongoose.set("strictQuery", true);

export async function connectMongo() {
  if (env.DNS_SERVERS) dns.setServers(env.DNS_SERVERS.split(",").map((s) => s.trim()));
  await mongoose.connect(env.MONGODB_URI, {
    // Connection pooling: keep up to 10 open connections and reuse them.
    // Small on purpose: too many connections make the DB slower, not faster.
    maxPoolSize: 10,
    minPoolSize: 1,
    // Timeouts: fail fast instead of hanging when the DB is unreachable
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
    // We create indexes ourselves at startup (see server.js), not lazily in the background
    autoIndex: false,
  });
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

export const disconnectMongo = () => mongoose.disconnect();
export const mongoState = () => mongoose.STATES[mongoose.connection.readyState];
