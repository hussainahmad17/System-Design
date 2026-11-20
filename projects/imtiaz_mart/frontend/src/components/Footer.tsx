import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { collections } from "../data/catalog";

const YEAR = new Date().getFullYear();

export default function Footer() {
  const [subscribed, setSubscribed] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubscribed(true); // UI only for now
  };

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <p className="wordmark wordmark--light">Imtiaz Mart</p>
          <p>Full-grain leather jackets, cut and stitched by hand in small batches.</p>
          {subscribed ? (
            <p className="footer__thanks">You're on the list. We'll email you when new jackets arrive.</p>
          ) : (
            <form className="footer__form" onSubmit={onSubmit}>
              <label htmlFor="newsletter">Get new releases by email</label>
              <div className="footer__form-row">
                <input id="newsletter" className="input" type="email" required placeholder="you@example.com" autoComplete="email" />
                <button className="btn btn--light" type="submit">Subscribe</button>
              </div>
            </form>
          )}
        </div>

        <nav aria-label="Shop">
          <h2 className="footer__title">Shop</h2>
          <ul>
            {collections.map((c) => (
              <li key={c.handle}><Link to={`/collections/${c.handle}`}>{c.title}</Link></li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Help">
          <h2 className="footer__title">Help</h2>
          <ul>
            <li><Link to="/pages/track-order">Track your order</Link></li>
            <li><Link to="/pages/faq">FAQ</Link></li>
            <li><Link to="/pages/leather-care">Leather care guide</Link></li>
            <li><Link to="/pages/contact">Contact us</Link></li>
          </ul>
        </nav>

        <nav aria-label="Company">
          <h2 className="footer__title">Company</h2>
          <ul>
            <li><Link to="/pages/about">About us</Link></li>
            <li><Link to="/account/login">Sign in</Link></li>
            <li><Link to="/account/register">Create account</Link></li>
          </ul>
        </nav>
      </div>
      <div className="container footer__base">
        <p>© {YEAR} Imtiaz Mart</p>
        <p>Visa, Mastercard, PayPal and Apple Pay accepted</p>
      </div>
    </footer>
  );
}
