import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// Two tokens, two secrets:
// - Access token: short-lived (15 min), sent as "Authorization: Bearer ...".
//   Verified with the secret only, no DB lookup, so every API server can check it (stateless).
// - Refresh token: long-lived (7 days), stored in an httpOnly cookie that JavaScript can't read.
//   Used only to get a new access token. Carries a version number so we can revoke it.

const COMMON = { issuer: "imtiaz-mart", audience: "imtiaz-mart-web" };
// Pin the algorithm on verify: stops "alg: none" and algorithm-confusion attacks.
const VERIFY = { ...COMMON, algorithms: ["HS256"] };

export function signAccessToken(user) {
  return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    ...COMMON,
    algorithm: "HS256",
    subject: String(user._id),
    expiresIn: env.JWT_ACCESS_TTL,
  });
}

export function signRefreshToken(user) {
  return jwt.sign({ ver: user.tokenVersion }, env.JWT_REFRESH_SECRET, {
    ...COMMON,
    algorithm: "HS256",
    subject: String(user._id),
    expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d`,
  });
}

/** @returns {{ sub: string, role: string }} throws if invalid or expired */
export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET, VERIFY);

/** @returns {{ sub: string, ver: number }} throws if invalid or expired */
export const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET, VERIFY);
