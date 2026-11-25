import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { sendChat, type ChatMessage } from "../data/chat";
import { ApiError } from "../lib/http";
import { ChatIcon, CloseIcon, SendIcon } from "./Icons";
import "./chat-widget.css";

const GREETING = "Hi! I can check your orders, find products, and answer questions about shipping, returns and sizing.";
const STARTERS = ["Where is my order?", "What is your return policy?", "Do you have black leather jackets?"];

// The assistant answers in plain text. React escapes it, so nothing it writes can run as HTML.
// The only formatting we add: store paths it mentions (e.g. /pages/contact) become real links.
const STORE_PATH = /(\/(?:pages|collections|account)(?:\/[a-z0-9-]+)+)/g;
function withLinks(text: string): ReactNode[] {
  return text.split(STORE_PATH).map((part, i) =>
    i % 2 === 1 ? <Link key={i} to={part} className="link">{part}</Link> : part,
  );
}

function Conversation({ active }: { active: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []); // leaving the page cancels a waiting request
  useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending, error]);

  // Sends the conversation so far; the last message in it is the customer's new one
  const deliver = async (history: ChatMessage[]) => {
    setError("");
    setPending(true);
    const ctrl = new AbortController();
    request.current = ctrl;
    try {
      const reply = await sendChat(history, ctrl.signal);
      setMessages([...history, { role: "assistant", content: reply }]);
    } catch (err) {
      if (ctrl.signal.aborted) return;
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const send = (text: string) => {
    const content = text.trim();
    if (!content || pending) return;
    const history: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(history);
    setDraft("");
    void deliver(history);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  return (
    <>
      <div className="chat__messages" ref={listRef} aria-live="polite">
        <p className="chat__msg chat__msg--assistant">{GREETING}</p>
        {messages.length === 0 && (
          <div className="chat__starters">
            {STARTERS.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <p key={i} className={`chat__msg chat__msg--${m.role}`}>{m.role === "assistant" ? withLinks(m.content) : m.content}</p>
        ))}
        {pending && <p className="chat__msg chat__msg--assistant chat__typing" role="status">Looking that up…</p>}
        {error && (
          <p className="chat__error" role="alert">
            {error}{" "}
            <button type="button" className="link" onClick={() => void deliver(messages)}>Try again</button>
          </p>
        )}
      </div>
      <form className="chat__form" onSubmit={onSubmit}>
        <label htmlFor="chat-input" className="visually-hidden">Your message</label>
        <input
          id="chat-input"
          ref={inputRef}
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about an order or a product"
          maxLength={1000}
          autoComplete="off"
        />
        <button type="submit" className="btn btn--primary chat__send" disabled={pending || !draft.trim()} aria-label="Send message">
          <SendIcon />
        </button>
      </form>
    </>
  );
}

export default function ChatWidget() {
  const { status, user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Kept mounted while closed (hidden), so reopening shows the same conversation */}
      <section className="chat" role="dialog" aria-label="Support chat" hidden={!open}>
        <header className="chat__head">
          <h2 className="chat__title">Support</h2>
          <button type="button" className="chat__close" onClick={() => setOpen(false)} aria-label="Close chat"><CloseIcon /></button>
        </header>
        {status === "authed" && user ? (
          // key = the user: signing in as someone else starts an empty conversation
          <Conversation key={user.id} active={open} />
        ) : (
          <div className="chat__guest">
            <p>Sign in to chat with us. We need to know who you are before we can look up your orders.</p>
            <Link to="/account/login" className="btn btn--primary btn--block" onClick={() => setOpen(false)}>Sign in</Link>
            <p className="muted">Just browsing? The <Link to="/pages/faq" className="link" onClick={() => setOpen(false)}>FAQ</Link> covers shipping, returns and sizing.</p>
          </div>
        )}
      </section>
      <button type="button" className="chat-fab" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Close support chat" : "Open support chat"}>
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </>
  );
}
