import { Link } from "react-router";
import "./content.css";

// Native <details>: an accordion with zero JavaScript, keyboard accessible by default.
const GROUPS = [
  {
    title: "Orders and shipping",
    items: [
      ["How long does delivery take?", "Standard delivery takes 4 to 6 business days and express takes 1 to 2. You'll get a tracking link by email as soon as your jacket ships."],
      ["Do you ship internationally?", "Yes. We ship to Pakistan, the UAE, the UK and the US. Duties for international orders are shown at checkout."],
      ["Can I change my order?", "Email us within 12 hours of ordering and we'll change the size or address before it's packed."],
    ],
  },
  {
    title: "Returns and exchanges",
    items: [
      ["What is your return policy?", "You have 30 days from delivery to return an unworn jacket with its tags on. Returns are free for exchanges."],
      ["How do I exchange a size?", "Contact us with your order number and the size you need. We'll send the new size as soon as the original is on its way back."],
    ],
  },
  {
    title: "Sizing and fit",
    items: [
      ["How should a leather jacket fit?", "Snug across the shoulders, with room to cross your arms. Leather stretches slightly and moulds to you within a few weeks."],
      ["I'm between sizes. Which should I pick?", "Choose the smaller size for a fitted biker look and the larger one if you'll layer a knit underneath."],
    ],
  },
  {
    title: "Products and care",
    items: [
      ["Is your leather real?", "Yes. Every jacket and leather shoe is full-grain cowhide or lambskin. We never use bonded or synthetic leather."],
      ["How do I care for leather?", "Condition it twice a year and keep it away from heat. Our leather care guide has the full steps."],
      ["Do you repair leather pieces?", "Yes, for free, for as long as you own the jacket or shoes. Contact us to arrange a repair."],
      ["Do watches come with a warranty?", "Every watch has a 2-year warranty on the movement. Straps and batteries aren't covered."],
      ["Do your sunglasses block UV light?", "Yes. All lenses are rated UV400, which blocks 100% of UVA and UVB light."],
    ],
  },
] as const;

export default function Faq() {
  return (
    <>
      <header className="container page-head">
        <h1>Frequently asked questions</h1>
        <p>Can't find your answer? <Link to="/pages/contact" className="link">Contact us</Link>.</p>
      </header>

      <div className="container section faq">
        {GROUPS.map((g, i) => (
          <section key={g.title} className="faq__group" aria-labelledby={`faq-${i}`}>
            <h2 id={`faq-${i}`}>{g.title}</h2>
            {g.items.map(([q, a]) => (
              <details key={q} className="faq__item">
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
