import { env } from "../../config/env.js";
import { redis, subscribe } from "../../db/redis.js";
import { withTimeout } from "../../lib/cache.js";
import { BloomFilter } from "../../lib/bloomFilter.js";
import { User } from "../users/user.model.js";

// One bloom filter per field. Answers "does this email/username exist?":
//   bloom says NO  -> definitely free, answered from memory, zero DB queries
//   bloom says YES -> maybe taken, confirm with one indexed DB lookup
//
// Each API process keeps its own copy in memory. Behind the load balancer there are several
// processes, so a sign-up on process A must reach B and C too: A publishes it on a Redis
// pub/sub channel and every process adds it to its filter (see startIdentitySync).
// If Redis is down, a message can be missed: then B may say "free" for a taken email until
// it restarts. Harmless: the unique index still rejects the duplicate sign-up with a 409.
// Login never trusts the filter, so a missed message can't lock a real user out.

const FIELDS = ["email", "username"];
const filters = Object.fromEntries(
  FIELDS.map((f) => [f, new BloomFilter(env.BLOOM_EXPECTED_ITEMS, env.BLOOM_FALSE_POSITIVE_RATE)]),
);
const counters = { bloomNo: 0, dbChecks: 0, falsePositives: 0, synced: 0 };
const CHANNEL = "identity:new";
let ready = false;

/**
 * Load every existing email and username into the filters. Runs once at startup,
 * BEFORE the server accepts requests: an empty filter would say "free" for taken names.
 * Streams with a cursor in batches, so memory stays flat even with millions of users.
 */
export async function warmUpIdentityIndex() {
  // Subscribe FIRST, then load: a sign-up that happens during the load is still received
  const syncing = await subscribe(CHANNEL, (message) => {
    try {
      const { email, username } = JSON.parse(message);
      filters.email.add(email);
      filters.username.add(username);
      counters.synced++;
    } catch {
      /* ignore malformed messages */
    }
  });
  if (!syncing) console.warn("Bloom filters: Redis unavailable, sign-ups won't sync between API processes");

  const started = performance.now();
  const cursor = User.find({}, { _id: 0, email: 1, username: 1 }).lean().cursor({ batchSize: 1000 });
  for await (const u of cursor) {
    filters.email.add(u.email);
    filters.username.add(u.username);
  }
  ready = true;
  const ms = Math.round(performance.now() - started);
  console.log(`Bloom filters ready in ${ms} ms:`, JSON.stringify(identityIndexStats().filters.email));
}

/** Call after a successful sign-up: add it here, and tell every other API process. */
export function rememberIdentity({ email, username }) {
  filters.email.add(email);
  filters.username.add(username);
  const r = redis();
  if (r) withTimeout(r.publish(CHANNEL, JSON.stringify({ email, username }))).catch(() => {});
}

/**
 * @param {"email"|"username"} field
 * @param {string} value already normalised (trimmed, lowercased)
 * @returns {Promise<boolean>}
 */
export async function identityExists(field, value) {
  if (!ready) throw new Error("Identity index used before warm-up");

  if (!filters[field].mightContain(value)) {
    counters.bloomNo++;
    return false; // no false negatives: safe to skip the DB
  }

  // Covered query: filter and projection use only the indexed field and _id is excluded,
  // so MongoDB answers from the index alone without reading the user document.
  counters.dbChecks++;
  const hit = await User.findOne({ [field]: value }, { _id: 0, [field]: 1 }).lean();
  if (!hit) counters.falsePositives++;
  return hit !== null;
}

export function identityIndexStats() {
  return {
    ready,
    filters: Object.fromEntries(FIELDS.map((f) => [f, filters[f].stats()])),
    ...counters,
  };
}
