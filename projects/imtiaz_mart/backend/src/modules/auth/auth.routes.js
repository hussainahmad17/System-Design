import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { requireAuth } from "../../middleware/requireAuth.js";
import * as c from "./auth.controller.js";

// Rate limits slow down password guessing and email-list probing.
// The counters live in this process's memory. With several servers, move them to Redis.
const limiter = (limit, windowMs, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { code: "RATE_LIMITED", message } },
  });

const credentialsLimit = limiter(10, 15 * 60 * 1000, "Too many attempts. Try again in 15 minutes.");
const availabilityLimit = limiter(30, 60 * 1000, "Too many checks. Try again in a minute.");
const refreshLimit = limiter(60, 15 * 60 * 1000, "Too many requests. Try again later.");

export const authRouter = Router();

authRouter.post("/register", credentialsLimit, c.register);
authRouter.post("/login", credentialsLimit, c.login);
authRouter.post("/refresh", refreshLimit, c.refresh);
authRouter.post("/logout", c.logout);
authRouter.post("/logout-all", requireAuth, c.logoutAll);
authRouter.get("/me", requireAuth, c.me);
authRouter.get("/availability", availabilityLimit, c.availability);
