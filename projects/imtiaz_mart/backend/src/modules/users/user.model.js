import mongoose from "mongoose";

// Only the fields auth needs. Addresses, orders etc. come later in their own collections.
const userSchema = new mongoose.Schema(
  {
    // Stored lowercased, so lookups are exact matches on the index.
    // (A case-insensitive regex or $toLower in the query would skip the index: not sargable.)
    username: { type: String, required: true, trim: true, lowercase: true, minlength: 3, maxlength: 30 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    // select: false -> never returned unless a query asks for it explicitly
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    // Bumped on "log out everywhere"; refresh tokens with an older version are rejected
    tokenVersion: { type: Number, default: 0, select: false },
  },
  {
    // _id is an ObjectId: it starts with a timestamp, so new users go at the end
    // of the _id B-tree (like UUIDv7), with no random page splits.
    timestamps: true,
    versionKey: false,
  },
);

// Read-heavy lookups, so both get an index (O(log n) instead of a full scan O(n)):
// - email: login, availability check, duplicate check on sign-up
// - username: login, availability check, duplicate check on sign-up
// unique: true also makes the DB the final guard against duplicates, even when two
// sign-ups race each other. The bloom filter is a speed-up, never the source of truth.
userSchema.index({ email: 1 }, { unique: true, name: "uniq_email" });
userSchema.index({ username: 1 }, { unique: true, name: "uniq_username" });

// Public fields only: the one projection used for every response that returns a user
export const PUBLIC_FIELDS = "username email firstName lastName role";

export function toPublicUser(doc) {
  return {
    id: String(doc._id),
    username: doc.username,
    email: doc.email,
    firstName: doc.firstName,
    lastName: doc.lastName,
    role: doc.role,
  };
}

export const User = mongoose.model("User", userSchema);
