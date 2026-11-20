import { HttpError } from "../lib/httpError.js";
import { verifyAccessToken } from "../lib/tokens.js";

// Stateless check: verify the signature and expiry with the secret. No DB query,
// so this costs microseconds and works the same on every server.
export function requireAuth(req, _res, next) {
  const [scheme, token] = (req.get("authorization") ?? "").split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new HttpError(401, "AUTH_REQUIRED", "Sign in to continue");
  }
  try {
    const claims = verifyAccessToken(token);
    req.auth = { userId: claims.sub, role: claims.role };
  } catch (err) {
    const expired = err?.name === "TokenExpiredError";
    throw new HttpError(401, expired ? "TOKEN_EXPIRED" : "INVALID_TOKEN", expired ? "Access token expired" : "Invalid access token");
  }
  next();
}
