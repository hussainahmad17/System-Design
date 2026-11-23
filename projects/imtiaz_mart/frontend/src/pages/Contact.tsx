import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import "./content.css";

export default function Contact() {
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true); // UI only
  };

  return (
    <>
      <header className="container page-head">
        <h1>Contact us</h1>
        <p>Questions about sizing, an order or a repair? We reply within one business day.</p>
      </header>

      <section className="container section contact">
        <div>
          {sent ? (
            <p className="notice" role="status">Messages aren't connected yet, so this one wasn't sent. Email us at hello@scalecart.example instead.</p>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="field-row">
                <div className="field"><label htmlFor="name">Name</label><input id="name" className="input" required autoComplete="name" /></div>
                <div className="field"><label htmlFor="email">Email</label><input id="email" className="input" type="email" required autoComplete="email" /></div>
              </div>
              <div className="field">
                <label htmlFor="order">Order number (optional)</label>
                <input id="order" className="input" placeholder="SC-32833A06" pattern="[Ss][Cc]-?[0-9A-Fa-f]{8}" />
              </div>
              <div className="field">
                <label htmlFor="topic">What's it about?</label>
                <select id="topic" className="select" defaultValue="sizing">
                  <option value="sizing">Sizing and fit</option>
                  <option value="order">An existing order</option>
                  <option value="returns">Returns and exchanges</option>
                  <option value="repair">A repair</option>
                  <option value="other">Something else</option>
                </select>
              </div>
              <div className="field"><label htmlFor="message">Message</label><textarea id="message" className="textarea" required minLength={10} maxLength={2000} /></div>
              <button type="submit" className="btn btn--primary">Send message</button>
            </form>
          )}
        </div>

        <aside className="contact__info">
          <div><h2>Email</h2><p>hello@scalecart.example</p></div>
          <div><h2>Phone</h2><p>+92 300 000 0000<br /><span className="muted">Monday to Saturday, 10am to 7pm</span></p></div>
          <div><h2>Workshop</h2><p>12 Tannery Lane<br />Lahore, Pakistan</p></div>
          <div><h2>Before you write</h2><p>Many answers are in our <Link to="/pages/faq" className="link">FAQ</Link>, and you can <Link to="/pages/track-order" className="link">track your order</Link> yourself.</p></div>
        </aside>
      </section>
    </>
  );
}
