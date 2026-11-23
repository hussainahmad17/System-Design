import { env } from "../../config/env.js";
import * as auth from "./auth.service.js";
import { availabilitySchema, loginSchema, registerSchema } from "./auth.schemas.js";

// Refresh token cookie: httpOnly (JS can't read it, so XSS can't steal it),
// sameSite strict (not sent from other sites, which blocks CSRF),
// path-scoped to /api/v1/auth (not sent on every product or cart request).
const REFRESH_COOKIE = "rt";
const cookieOptions = {
  httpOnly: true,
  secure: env.cookieSecure, // HTTPS only (production default)
  sameSite: "strict",
  path: "/api/v1/auth",
  maxAge: env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
};

const sendSession = (res, status, { user, accessToken, refreshToken }) => {
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  res.status(status).json({ user, accessToken });
};

export async function register(req, res) {
  sendSession(res, 201, await auth.register(registerSchema.parse(req.body)));
}

export async function login(req, res) {
  sendSession(res, 200, await auth.login(loginSchema.parse(req.body)));
}

export async function refresh(req, res) {
  try {
    const { accessToken, refreshToken } = await auth.refresh(req.cookies?.[REFRESH_COOKIE]);
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.json({ accessToken });
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions, maxAge: undefined });
    throw err;
  }
}

// This device only: drop the cookie. The short-lived access token expires on its own.
export function logout(_req, res) {
  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.status(204).end();
}

export async function logoutAll(req, res) {
  await auth.logoutEverywhere(req.auth.userId);
  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions, maxAge: undefined });
  res.status(204).end();
}

export async function me(req, res) {
  res.json({ user: await auth.getProfile(req.auth.userId) });
}

export async function availability(req, res) {
  const result = await auth.checkAvailability(availabilitySchema.parse({ ...req.query }));
  res.set("Cache-Control", "no-store").json(result);
}
