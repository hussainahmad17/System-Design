import { env } from "../../config/env.js";
import { BloomFilter } from "../../lib/bloomFilter.js";
import { User } from "../users/user.model.js";

// One bloom filter per field. Answers "does this email/username exist?":
//   bloom says NO  -> definitely free, answered from memory, zero DB queries
//   bloom says YES -> maybe taken, confirm with one indexed DB lookup
//
// Kept in this process's memory. Correct while there is ONE API server.
// With several servers behind a load balancer, a sign-up on server A is not in
// server B's filter, so B could wrongly say "free" (the unique index still blocks
// the duplicate). At that point, move the filters to Redis (RedisBloom) so all servers share one.

const FIELDS = ["email", "username"];
const filters = Object.fromEntries(
  FIELDS.map((f) => [f, new BloomFilter(env.BLOOM_EXPECTED_ITEMS, env.BLOOM_FALSE_POSITIVE_RATE)]),
);
const counters = { bloomNo: 0, dbChecks: 0, falsePositives: 0 };
let ready = false;

/**
 * Load every existing email and username into the filters. Runs once at startup,
 * BEFORE the server accepts requests: an empty filter would say "free" for taken names.
 * Streams with a cursor in batches, so memory stays flat even with millions of users.
 */
export async function warmUpIdentityIndex() {
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

/** Call after a successful sign-up so the filters stay in sync. */
export function rememberIdentity({ email, username }) {
  filters.email.add(email);
  filters.username.add(username);
}

/** Cheap pre-check only: false = definitely not registered. */
export function mightExist(field, value) {
  return filters[field].mightContain(value);
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
