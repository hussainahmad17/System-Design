import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireAuth } from "../../middleware/requireAuth.js";
import * as c from "./auth.controller.js";

// Rate limits slow down password guessing and email-list probing.
// The counters live in this process's memory. With several servers, move them to Redis.
const limiter = (limit, windowMs, message, extra = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { code: "RATE_LIMITED", message } },
    ...extra,
  });

// Login: count only FAILED attempts (status >= 400). Password guessing is many failures;
// a real customer signing in and out several times should never be locked out.
const loginLimit = limiter(10, 15 * 60 * 1000, "Too many failed sign-in attempts. Try again in 15 minutes.", {
  skipSuccessfulRequests: true,
});
// Sign-up: its own counter, so creating accounts doesn't use up the login budget (and vice versa)
const registerLimit = limiter(10, 60 * 60 * 1000, "Too many sign-up attempts. Try again in an hour.");
const availabilityLimit = limiter(30, 60 * 1000, "Too many checks. Try again in a minute.");
const refreshLimit = limiter(60, 15 * 60 * 1000, "Too many requests. Try again later.");

export const authRouter = Router();

authRouter.post("/register", registerLimit, c.register);
authRouter.post("/login", loginLimit, c.login);
authRouter.post("/refresh", refreshLimit, c.refresh);
authRouter.post("/logout", c.logout);
authRouter.post("/logout-all", requireAuth, c.logoutAll);
authRouter.get("/me", requireAuth, c.me);
authRouter.get("/availability", availabilityLimit, c.availability);
