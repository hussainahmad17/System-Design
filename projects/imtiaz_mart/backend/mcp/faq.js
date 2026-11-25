// Store policies the support chatbot is allowed to quote.
// The MCP server exposes this as a RESOURCE (read-only data), not a tool.
//
// This is a second copy: the FAQ page (frontend/src/pages/Faq.tsx) has the same answers,
// and the shipping prices repeat the rules in src/modules/orders/order.service.js.
// When one changes, change the other too.

/** The address of the resource. Server and host must agree on it, so it lives here. */
export const FAQ_URI = "support://faq";

export const FAQ = [
  {
    topic: "Orders and shipping",
    items: [
      ["How long does delivery take?", "Standard delivery takes 4 to 6 business days and express takes 1 to 2. You'll get a tracking link by email as soon as your jacket ships."],
      ["Do you ship internationally?", "Yes. We ship to Pakistan, the UAE, the UK and the US. Duties for international orders are shown at checkout."],
      ["Can I change my order?", "Email us within 12 hours of ordering and we'll change the size or address before it's packed."],
      ["How much is shipping?", "Standard shipping is $15 and free on orders of $300 or more. Express shipping is $35."],
      ["How can I pay?", "Cash on delivery. You pay when the order arrives."],
    ],
  },
  {
    topic: "Returns and exchanges",
    items: [
      ["What is your return policy?", "You have 30 days from delivery to return an unworn jacket with its tags on. Returns are free for exchanges."],
      ["How do I exchange a size?", "Contact us with your order number and the size you need. We'll send the new size as soon as the original is on its way back."],
    ],
  },
  {
    topic: "Sizing and fit",
    items: [
      ["How should a leather jacket fit?", "Snug across the shoulders, with room to cross your arms. Leather stretches slightly and moulds to you within a few weeks."],
      ["I'm between sizes. Which should I pick?", "Choose the smaller size for a fitted biker look and the larger one if you'll layer a knit underneath."],
    ],
  },
  {
    topic: "Products and care",
    items: [
      ["Is your leather real?", "Yes. Every jacket and leather shoe is full-grain cowhide or lambskin. We never use bonded or synthetic leather."],
      ["How do I care for leather?", "Condition it twice a year and keep it away from heat. Our leather care guide has the full steps."],
      ["Do you repair leather pieces?", "Yes, for free, for as long as you own the jacket or shoes. Contact us to arrange a repair."],
      ["Do watches come with a warranty?", "Every watch has a 2-year warranty on the movement. Straps and batteries aren't covered."],
      ["Do your sunglasses block UV light?", "Yes. All lenses are rated UV400, which blocks 100% of UVA and UVB light."],
    ],
  },
];

/** Plain text for the LLM: one "Q / A" pair per block. */
export const faqAsText = () =>
  FAQ.map((g) => `## ${g.topic}\n` + g.items.map(([q, a]) => `Q: ${q}\nA: ${a}`).join("\n\n")).join("\n\n");
