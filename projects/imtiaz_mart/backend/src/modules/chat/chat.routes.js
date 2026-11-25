import { Router } from "express";
import { z } from "zod";
import { limiter } from "../../lib/rateLimit.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { answerCustomer } from "./chat.service.js";

// The browser sends the recent conversation with every request, so the server keeps no chat
// state. Any of the 3 API processes can answer any message (no sticky sessions needed).
// Only plain user/assistant text is accepted: tool calls and results are never taken from
// the client. A customer who edits the history can only confuse their own chat; the order
// tools still use the user id from their token.
const MAX_MESSAGES = 8;
const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1, "Type a message").max(1000, "Message is too long"),
      }),
    )
    .min(1)
    .max(MAX_MESSAGES)
    // "?." because Zod still runs this check when the list is empty (min(1) already failed)
    .refine((m) => m.at(-1)?.role === "user", "The last message must be from the customer"),
});

// Every message costs money (LLM tokens), so the limit is per signed-in USER, not per IP:
// it can't be dodged by changing network, and people sharing one IP don't block each other.
const chatLimit = limiter("chat", 20, 10 * 60 * 1000, "You've sent a lot of messages. Please wait a few minutes.", {
  keyGenerator: (req) => req.auth.userId,
});

export const chatRouter = Router();

// POST /api/v1/chat   { messages: [{ role, content }, ...] }  ->  { reply }
// requireAuth runs first: the limiter needs the user id, and a rejected token costs microseconds.
chatRouter.post("/", requireAuth, chatLimit, async (req, res) => {
  const { messages } = chatSchema.parse(req.body);
  const reply = await answerCustomer({ userId: req.auth.userId, history: messages });
  res.json({ reply });
});
