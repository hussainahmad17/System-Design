import { Link } from "react-router";
import { FREE_SHIPPING_FROM_CENTS, useCart } from "../cart/CartContext";
import Img from "../components/Img";
import { formatPrice } from "../data/catalog";
import "./cart.css";

export default function Cart() {
  const { lines, subtotal, setQty, remove } = useCart();

  if (lines.length === 0) {
    return (
      <section className="container section empty">
        <h1>Your cart is empty</h1>
        <p className="lede">Find a jacket you'll wear for the next twenty years.</p>
        <div className="empty__ctas">
          <Link to="/collections/best-sellers" className="btn btn--primary">Shop best sellers</Link>
          <Link to="/collections/leather-jackets" className="btn btn--outline">Shop leather jackets</Link>
        </div>
      </section>
    );
  }

  const toFree = FREE_SHIPPING_FROM_CENTS - subtotal;

  return (
    <section className="container section">
      <h1>Your cart</h1>
      <div className="cart">
        <ul className="cart__lines">
          {lines.map((l) => (
            <li key={l.key} className="line">
              <Img id={l.image} alt={l.name} ratio={1.25} sizes="120px" className="line__img" />
              <div className="line__info">
                <h2 className="line__name">{l.name}</h2>
                <p className="muted">{l.colour}{l.size === "One size" ? "" : `, size ${l.size}`}</p>
                <div className="line__controls">
                  <div className="qty" role="group" aria-label={`Quantity for ${l.name}`}>
                    <button onClick={() => setQty(l.key, l.qty - 1)} disabled={l.qty <= 1} aria-label="Decrease quantity">−</button>
                    <span aria-live="polite">{l.qty}</span>
                    <button onClick={() => setQty(l.key, l.qty + 1)} disabled={l.qty >= 10} aria-label="Increase quantity">+</button>
                  </div>
                  <button className="link line__remove" onClick={() => remove(l.key)}>Remove</button>
                </div>
              </div>
              <p className="line__total">{formatPrice(l.lineTotal)}</p>
            </li>
          ))}
        </ul>

        <aside className="summary" aria-label="Order summary">
          <p className="summary__ship">
            {toFree > 0 ? `Add ${formatPrice(toFree)} more for free shipping.` : "Your order ships free."}
          </p>
          <div className="summary__row"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <p className="form-note">Taxes and shipping are calculated at checkout.</p>
          <Link to="/checkout" className="btn btn--primary btn--block">Check out</Link>
          <Link to="/collections/best-sellers" className="link summary__continue">Continue shopping</Link>
        </aside>
      </div>
    </section>
  );
}
