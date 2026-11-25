import { authed } from "../auth/api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// The server keeps no chat state: we send the recent conversation with every message.
// Limits mirror the server's validation (8 messages, 1000 characters each).
const MAX_MESSAGES = 8;
const MAX_CHARS = 1000;

export async function sendChat(history: ChatMessage[], signal?: AbortSignal): Promise<string> {
  const messages = history.slice(-MAX_MESSAGES).map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
  // An answer can need several LLM and tool round trips; the server gives up at 25 s
  const { reply } = await authed<{ reply: string }>("/chat", { method: "POST", body: { messages }, signal, timeoutMs: 30_000 });
  return reply;
}
