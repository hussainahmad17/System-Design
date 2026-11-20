import { HttpError } from "../../lib/httpError.js";
import { burnPasswordCheck, hashPassword, verifyPassword } from "../../lib/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/tokens.js";
import { PUBLIC_FIELDS, toPublicUser, User } from "../users/user.model.js";
import { identityExists, mightExist, rememberIdentity } from "./identityIndex.js";

const issueTokens = (user) => ({
  accessToken: signAccessToken(user),
  refreshToken: signRefreshToken(user),
});

const invalidLogin = () => new HttpError(401, "INVALID_CREDENTIALS", "Email/username or password is incorrect");
const invalidSession = () => new HttpError(401, "INVALID_SESSION", "Your session has ended. Please sign in again.");

export async function register(input) {
  // Friendly early answer. Usually costs zero DB queries: new emails are "definitely not" in the bloom filter.
  const [emailTaken, usernameTaken] = await Promise.all([
    identityExists("email", input.email),
    identityExists("username", input.username),
  ]);
  if (emailTaken || usernameTaken) {
    throw new HttpError(409, "IDENTITY_TAKEN", "An account with these details already exists", {
      ...(emailTaken && { email: "This email is already registered" }),
      ...(usernameTaken && { username: "This username is taken" }),
    });
  }

  const { password, ...profile } = input;
  let user;
  try {
    user = await User.create({ ...profile, passwordHash: await hashPassword(password) });
  } catch (err) {
    // Two sign-ups with the same email at the same moment both pass the check above.
    // The unique index lets only one insert win; the other lands here.
    if (err?.code === 11000) {
      const field = Object.keys(err.keyPattern ?? {})[0] ?? "email";
      throw new HttpError(409, "IDENTITY_TAKEN", "An account with these details already exists", {
        [field]: field === "email" ? "This email is already registered" : "This username is taken",
      });
    }
    throw err;
  }

  rememberIdentity(user);
  return { user: toPublicUser(user), ...issueTokens(user) };
}

export async function login({ identifier, password }) {
  const field = identifier.includes("@") ? "email" : "username";

  // Bloom filter says this account definitely doesn't exist: skip the DB read,
  // but still spend the hashing time so the response isn't faster (no timing leak).
  if (!mightExist(field, identifier)) {
    await burnPasswordCheck(password);
    throw invalidLogin();
  }

  // One indexed lookup (uniq_email or uniq_username). Fetch only what login needs.
  const user = await User.findOne({ [field]: identifier })
    .select(`${PUBLIC_FIELDS} +passwordHash +tokenVersion`)
    .lean();

  if (!user) {
    await burnPasswordCheck(password);
    throw invalidLogin();
  }
  if (!(await verifyPassword(password, user.passwordHash))) throw invalidLogin();

  return { user: toPublicUser(user), ...issueTokens(user) };
}

export async function refresh(refreshToken) {
  if (!refreshToken) throw invalidSession();
  let claims;
  try {
    claims = verifyRefreshToken(refreshToken);
  } catch {
    throw invalidSession();
  }

  // The one DB read in the refresh flow: lookup by _id (primary index), two small fields
  const user = await User.findById(claims.sub).select("role +tokenVersion").lean();
  if (!user || user.tokenVersion !== claims.ver) throw invalidSession(); // revoked by "log out everywhere"

  return issueTokens(user); // rotate: the client gets a fresh refresh token too
}

/** Revokes every refresh token this user holds, on all devices. */
export async function logoutEverywhere(userId) {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
}

export async function getProfile(userId) {
  const user = await User.findById(userId).select(PUBLIC_FIELDS).lean();
  if (!user) throw invalidSession();
  return toPublicUser(user);
}

export async function checkAvailability(query) {
  const field = query.email !== undefined ? "email" : "username";
  const value = query[field];
  return { field, available: !(await identityExists(field, value)) };
}
