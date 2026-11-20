import { useState } from "react";
import { useCart } from "../cart/CartContext";
import { formatPrice, type Product } from "../data/catalog";
import Img from "./Img";
import "./product-card.css";

// Quick add: pick a size right on the card (there is no product page yet).
// One-size products (watches, sunglasses) go straight into the cart.
export default function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const { add } = useCart();
  const [picking, setPicking] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const oneSize = product.sizes.length <= 1;

  const choose = (size: string) => {
    add(product, size);
    setAdded(size);
    setPicking(false);
  };

  const addedLabel = added && (oneSize ? "Added. Add another" : `Added in ${added}. Add another`);

  return (
    <article className="card">
      <div className="card__media">
        <Img
          id={product.image}
          alt={`${product.name} in ${product.colour.toLowerCase()}`}
          sizes="(min-width: 1200px) 20vw, (min-width: 768px) 33vw, 50vw"
          priority={priority}
        />
        {product.compareAtCents && <span className="card__badge">Sale</span>}
      </div>
      <div className="card__body">
        <h3 className="card__name">{product.name}</h3>
        <p className="card__colour">{product.colour}</p>
        <p className="card__price">
          {product.compareAtCents && <s className="muted">{formatPrice(product.compareAtCents)}</s>} {formatPrice(product.priceCents)}
        </p>
      </div>

      {picking ? (
        <div className={`card__sizes ${product.sizes.length > 6 ? "card__sizes--4" : ""}`} role="group" aria-label={`Choose a size for ${product.name}`}>
          {product.sizes.map((s) => (
            <button key={s} className="size-btn" onClick={() => choose(s)}>{s}</button>
          ))}
        </div>
      ) : (
        <button
          className="btn btn--outline btn--block card__add"
          onClick={() => (oneSize ? choose(product.sizes[0] ?? "One size") : setPicking(true))}
        >
          {addedLabel || "Add to cart"}
        </button>
      )}
      <p className="visually-hidden" aria-live="polite">{added ? `${product.name}${oneSize ? "" : `, size ${added}`}, added to cart` : ""}</p>
    </article>
  );
}

/** Same footprint as a card, shown while a page loads: no layout jump when data arrives. */
export function ProductCardSkeleton() {
  return (
    <div className="card card--skeleton" aria-hidden="true">
      <div className="card__media" />
      <div className="skeleton-line" style={{ width: "70%" }} />
      <div className="skeleton-line" style={{ width: "40%" }} />
      <div className="skeleton-line" style={{ width: "100%", height: 44, marginTop: 12 }} />
    </div>
  );
}
