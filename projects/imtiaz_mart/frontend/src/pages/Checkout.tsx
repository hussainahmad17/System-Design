import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { FREE_SHIPPING_FROM_CENTS, useCart } from "../cart/CartContext";
import Img from "../components/Img";
import { formatPrice } from "../data/catalog";
import "./checkout.css";

const SHIPPING = {
  standard: { label: "Standard, 4 to 6 business days", price: 15_00 },
  express: { label: "Express, 1 to 2 business days", price: 35_00 },
} as const;
type ShipKey = keyof typeof SHIPPING;

// UI only: no payment provider is connected yet.
export default function Checkout() {
  const { lines, subtotal } = useCart();
  const { status, user } = useAuth();
  const [ship, setShip] = useState<ShipKey>("standard");
  const [submitted, setSubmitted] = useState(false);

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

  const onSubmit = (e: FormEvent) => {
    e.preventDefault(); // the browser has already checked the required fields
    setSubmitted(true);
  };

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
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" className="input" type="email" required autoComplete="email" />
            </div>
          )}
        </section>

        <section>
          <h2>Delivery</h2>
          <div className="field">
            <label htmlFor="country">Country</label>
            <select id="country" className="select" autoComplete="country-name" defaultValue="Pakistan">
              <option>Pakistan</option>
              <option>United Arab Emirates</option>
              <option>United Kingdom</option>
              <option>United States</option>
            </select>
          </div>
          <div className="field-row">
            <div className="field"><label htmlFor="fname">First name</label><input id="fname" className="input" required autoComplete="given-name" defaultValue={user?.firstName} /></div>
            <div className="field"><label htmlFor="lname">Last name</label><input id="lname" className="input" required autoComplete="family-name" defaultValue={user?.lastName} /></div>
          </div>
          <div className="field"><label htmlFor="address">Address</label><input id="address" className="input" required autoComplete="street-address" /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="city">City</label><input id="city" className="input" required autoComplete="address-level2" /></div>
            <div className="field"><label htmlFor="postal">Postal code</label><input id="postal" className="input" required autoComplete="postal-code" inputMode="numeric" pattern="[0-9A-Za-z \-]{3,10}" /></div>
          </div>
          <div className="field"><label htmlFor="phone">Phone</label><input id="phone" className="input" type="tel" required autoComplete="tel" /></div>
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
          <p className="form-note">All transactions are secure and encrypted.</p>
          <div className="field"><label htmlFor="card">Card number</label><input id="card" className="input" required inputMode="numeric" autoComplete="cc-number" pattern="[0-9 ]{12,23}" placeholder="1234 5678 9012 3456" /></div>
          <div className="field-row">
            <div className="field"><label htmlFor="exp">Expiry (MM / YY)</label><input id="exp" className="input" required autoComplete="cc-exp" pattern="(0[1-9]|1[0-2]) ?/ ?[0-9]{2}" placeholder="08 / 28" /></div>
            <div className="field"><label htmlFor="cvc">Security code</label><input id="cvc" className="input" required inputMode="numeric" autoComplete="cc-csc" pattern="[0-9]{3,4}" /></div>
          </div>
          <div className="field"><label htmlFor="cname">Name on card</label><input id="cname" className="input" required autoComplete="cc-name" /></div>
        </section>

        {submitted ? (
          <p className="notice" role="status">Payments aren't connected yet, so no order was placed. Your details were not sent anywhere.</p>
        ) : (
          <button type="submit" className="btn btn--primary btn--block">Pay {formatPrice(total)}</button>
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
