import { useState } from "react";
import { useCart } from "../cart/CartContext";
import { formatPrice, SIZES, type Product, type Size } from "../data/catalog";
import Img from "./Img";
import "./product-card.css";

// Quick add: pick a size right on the card (there is no product page yet).
export default function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const [picking, setPicking] = useState(false);
  const [added, setAdded] = useState<Size | null>(null);

  const choose = (size: Size) => {
    add(product.id, size);
    setAdded(size);
    setPicking(false);
  };

  return (
    <article className="card">
      <div className="card__media">
        <Img id={product.image} alt={`${product.name} leather jacket in ${product.colour.toLowerCase()}`} sizes="(min-width: 1024px) 25vw, 50vw" />
        {product.compareAt && <span className="card__badge">Sale</span>}
      </div>
      <div className="card__body">
        <h3 className="card__name">{product.name}</h3>
        <p className="card__colour">{product.colour}</p>
        <p className="card__price">
          {product.compareAt && <s className="muted">{formatPrice(product.compareAt)}</s>} {formatPrice(product.price)}
        </p>
      </div>

      {picking ? (
        <div className="card__sizes" role="group" aria-label={`Choose a size for ${product.name}`}>
          {SIZES.map((s) => (
            <button key={s} className="size-btn" onClick={() => choose(s)}>{s}</button>
          ))}
        </div>
      ) : (
        <button className="btn btn--outline btn--block card__add" onClick={() => setPicking(true)}>
          {added ? `Added in ${added}. Add another` : "Add to cart"}
        </button>
      )}
      <p className="visually-hidden" aria-live="polite">{added ? `${product.name}, size ${added}, added to cart` : ""}</p>
    </article>
  );
}
