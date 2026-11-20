import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ApiError } from "../auth/api";
import { useAuth } from "../auth/AuthContext";
import { FREE_SHIPPING_FROM_CENTS, useCart } from "../cart/CartContext";
import Img from "../components/Img";
import { formatPrice } from "../data/catalog";
import { placeOrder, type Order } from "../data/orders";
import "./checkout.css";

const SHIPPING = {
  standard: { label: "Standard, 4 to 6 business days", price: 15_00 },
  express: { label: "Express, 1 to 2 business days", price: 35_00 },
} as const;
type ShipKey = keyof typeof SHIPPING;

type Phase =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "error"; message: string; details?: Record<string, string> }
  | { kind: "done"; order: Order };

// Payment is cash on delivery for now: no card data is collected or sent anywhere.
export default function Checkout() {
  const { lines, subtotal, clear } = useCart();
  const { status, user } = useAuth();
  const [ship, setShip] = useState<ShipKey>("standard");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  // One key per checkout: a retry (double click, timeout) returns the same order, never a second one
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  if (phase.kind === "done") {
    const { order } = phase;
    return (
      <section className="container section empty-checkout" role="status">
        <h1>Thank you, your order is placed</h1>
        <p className="lede">Order <strong>{order.number}</strong>, total {formatPrice(order.totalCents)}, paid in cash on delivery.</p>
        <p className="muted">We'll send updates to {user?.email}.</p>
        <Link to="/collections/best-sellers" className="btn btn--primary">Continue shopping</Link>
      </section>
    );
  }

  if (lines.length === 0) {
    return (
      <section className="container section empty-checkout">
        <h1>Your cart is empty</h1>
        <p className="lede">Add a jacket to your cart before you check out.</p>
        <Link to="/collections/best-sellers" className="btn btn--primary">Shop best sellers</Link>
      </section>
    );
  }

  const shipping = ship === "standard" && subtotal >= FREE_SHIPPING_FROM_CENTS ? 0 : SHIPPING[ship].price;
  const total = subtotal + shipping;

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // the browser has already checked the required fields
    if (phase.kind === "sending") return;
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    setPhase({ kind: "sending" });
    try {
      const { order } = await placeOrder(
        {
          items: lines.map((l) => ({ productId: l.productId, size: l.size, qty: l.qty })),
          shippingMethod: ship,
          address: { firstName: get("fname"), lastName: get("lname"), line1: get("address"), city: get("city"), postalCode: get("postal"), country: get("country"), phone: get("phone") },
        },
        idempotencyKey,
      );
      clear();
      setPhase({ kind: "done", order });
      window.scrollTo(0, 0);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't place your order. Please try again.";
      // Per-item reasons only for cart problems; field errors (VALIDATION_FAILED) are not keyed by product
      const itemCodes = ["OUT_OF_STOCK", "CART_INVALID"];
      const details = err instanceof ApiError && itemCodes.includes(err.code) ? err.details : undefined;
      setPhase({ kind: "error", message, details });
    }
  };
  const nameOf = (productId: string) => lines.find((l) => l.productId === productId)?.name ?? "An item";

  return (
    <div className="checkout">
      {/* key: re-mount once the session is restored, so the account's details pre-fill the fields */}
      <form className="checkout__form" onSubmit={onSubmit} key={user?.id ?? "guest"}>
        <h1 className="visually-hidden">Checkout</h1>
        <section>
          <div className="checkout__head">
            <h2>Contact</h2>
            {status === "guest" && (
              // state.from: after signing in, come straight back to checkout
              <Link to="/account/login" state={{ from: "/checkout" }} className="link">Sign in</Link>
            )}
          </div>
          {user ? (
            <p className="checkout__account">
              Signed in as <strong>{user.email}</strong>
              <input type="hidden" name="email" value={user.email} />
            </p>
          ) : (
            <p className="form-note">Sign in to place an order, so you can track it from your account.</p>
          )}
        </section>

        <section>
          <h2>Delivery</h2>
          <div className="field">
            <label htmlFor="country">Country</label>
            <select id="country" name="country" className="select" autoComplete="country-name" defaultValue="Pakistan">
              <option>Pakistan</option>
              <option>United Arab Emirates</option>
              <option>United Kingdom</option>
              <option>United States</option>
            </select>
          </div>
          <div className="field-row">
            <div className="field"><label htmlFor="fname">First name</label><input id="fname" name="fname" className="input" required autoComplete="given-name" defaultValue={user?.firstName} /></div>
            <div className="field"><label htmlFor="lname">Last name</label><input id="lname" name="lname" className="input" required autoComplete="family-name" defaultValue={user?.lastName} /></div>
          </div>
          <div className="field"><label htmlFor="address">Address</label><input id="address" name="address" className="input" required minLength={3} maxLength={120} autoComplete="street-address" /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="city">City</label><input id="city" name="city" className="input" required autoComplete="address-level2" /></div>
            <div className="field"><label htmlFor="postal">Postal code</label><input id="postal" name="postal" className="input" required autoComplete="postal-code" inputMode="numeric" pattern="[0-9A-Za-z \-]{3,10}" /></div>
          </div>
          <div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" className="input" type="tel" required autoComplete="tel" pattern="\+?[0-9 \(\)\-]{7,20}" /></div>
        </section>

        <section>
          <h2>Shipping method</h2>
          <fieldset className="options">
            <legend className="visually-hidden">Shipping method</legend>
            {(Object.keys(SHIPPING) as ShipKey[]).map((key) => {
              const price = key === "standard" && subtotal >= FREE_SHIPPING_FROM_CENTS ? 0 : SHIPPING[key].price;
              return (
                <label key={key} className="option">
                  <input type="radio" name="ship" checked={ship === key} onChange={() => setShip(key)} />
                  <span>{SHIPPING[key].label}</span>
                  <span>{price === 0 ? "Free" : formatPrice(price)}</span>
                </label>
              );
            })}
          </fieldset>
        </section>

        <section>
          <h2>Payment</h2>
          <div className="options">
            <label className="option">
              <input type="radio" name="payment" checked readOnly />
              <span>Cash on delivery</span>
              <span className="muted">Pay when it arrives</span>
            </label>
          </div>
        </section>

        {phase.kind === "error" && (
          <div className="form-error" role="alert">
            <p>{phase.message}</p>
            {phase.details && (
              <ul>
                {Object.entries(phase.details).map(([id, why]) => <li key={id}>{nameOf(id)}: {why}</li>)}
              </ul>
            )}
            {phase.details && <Link to="/cart" className="link">Update your cart</Link>}
          </div>
        )}

        {status === "guest" ? (
          <Link to="/account/login" state={{ from: "/checkout" }} className="btn btn--primary btn--block">Sign in to place your order</Link>
        ) : (
          <button type="submit" className="btn btn--primary btn--block" disabled={status !== "authed" || phase.kind === "sending"}>
            {phase.kind === "sending" ? "Placing your order…" : `Place order, ${formatPrice(total)}`}
          </button>
        )}
      </form>

      <aside className="checkout__summary" aria-label="Order summary">
        {/* Collapsed on phones so the form comes first; always open on desktop */}
        <details className="summary-toggle" open={window.matchMedia("(min-width: 1000px)").matches}>
          <summary>Order summary <strong>{formatPrice(total)}</strong></summary>
          <ul className="mini-lines">
            {lines.map((l) => (
              <li key={l.key}>
                <span className="mini-lines__img">
                  <Img id={l.image} alt={l.name} ratio={1.25} sizes="64px" />
                  <span className="mini-lines__qty">{l.qty}</span>
                </span>
                <span>{l.name}<br /><span className="muted">{l.size === "One size" ? l.colour : `Size ${l.size}`}</span></span>
                <span>{formatPrice(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="totals">
            <div><dt>Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
            <div><dt>Shipping</dt><dd>{shipping === 0 ? "Free" : formatPrice(shipping)}</dd></div>
            <div className="totals__grand"><dt>Total</dt><dd>{formatPrice(total)}</dd></div>
          </dl>
        </details>
      </aside>
    </div>
  );
}
