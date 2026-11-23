import { useState, type FormEvent } from "react";
import "./content.css";

// A real sequence, so numbered steps fit here. Demo data until the orders API exists.
const STEPS = [
  { label: "Order placed", date: "Nov 14" },
  { label: "Made and checked", date: "Nov 15" },
  { label: "Shipped", date: "Nov 17" },
  { label: "Out for delivery", date: null },
  { label: "Delivered", date: null },
];
const CURRENT = 2; // index of the latest completed step

export default function TrackOrder() {
  const [order, setOrder] = useState<string | null>(null);
  const [error, setError] = useState("");

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const raw = String(new FormData(e.currentTarget).get("order") ?? "").trim().toUpperCase();
    // Order numbers are "SC-" + 8 hex characters (the end of the order's id), e.g. SC-32833A06
    if (!/^SC-?[0-9A-F]{8}$/.test(raw)) {
      setError("Enter the order number from your confirmation email. It looks like SC-32833A06.");
      return;
    }
    setError("");
    setOrder(raw.startsWith("SC-") ? raw : raw.replace("SC", "SC-"));
  };

  return (
    <>
      <header className="container page-head">
        <h1>Track your order</h1>
        <p>Enter your order number and the email you ordered with.</p>
      </header>

      <section className="container section track">
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="order">Order number</label>
            <input id="order" name="order" className="input" required placeholder="SC-32833A06" aria-invalid={!!error} aria-describedby={error ? "order-error" : undefined} />
            {error && <span id="order-error" className="field-error">{error}</span>}
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" className="input" type="email" required autoComplete="email" />
          </div>
          <button type="submit" className="btn btn--primary btn--block">Track order</button>
        </form>

        {order && (
          <div className="track__result" aria-live="polite">
            <h2>Order {order}</h2>
            <p className="muted">Sample tracking shown. Live tracking arrives with the orders system.</p>
            <ol className="timeline">
              {STEPS.map((s, i) => (
                <li key={s.label} className={i <= CURRENT ? "is-done" : ""} aria-current={i === CURRENT ? "step" : undefined}>
                  <span className="timeline__label">{s.label}</span>
                  <span className="muted">{s.date ?? "Pending"}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </>
  );
}
