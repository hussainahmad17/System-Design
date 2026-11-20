import { useEffect, useState } from "react";
import { Link } from "react-router";
import Img from "../components/Img";
import ProductCard, { ProductCardSkeleton } from "../components/ProductCard";
import { categories, fetchProducts, type Product } from "../data/catalog";
import "../components/product-card.css";
import "./home.css";

export default function Home() {
  const [bestSellers, setBestSellers] = useState<Product[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    // One request, 5 items, served by the {salesCount, _id} index
    fetchProducts({ sort: "best-selling", limit: 5 }, controller.signal)
      .then((r) => setBestSellers(r.items))
      .catch(() => !controller.signal.aborted && setFailed(true));
    return () => controller.abort();
  }, []);

  return (
    <>
      {/* Hero: the only priority image on the page */}
      <section className="hero">
        <Img id="1760533091973-1262bf57d244" alt="A rack of leather jackets in cognac, chestnut, black and suede" ratio={0.6} priority className="hero__img" />
        <div className="hero__content container">
          <h1 className="hero__title">Made to be worn for years, not seasons</h1>
          <p className="hero__text">Leather jackets, shoes, watches, sunglasses and clothing, chosen for how well they last.</p>
          <div className="hero__ctas">
            <Link to="/collections/leather-jackets" className="btn btn--light">Shop leather</Link>
            <Link to="/collections/best-sellers" className="btn btn--light">Shop best sellers</Link>
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="styles-title">
        <h2 id="styles-title">Shop by category</h2>
        <div className="tiles">
          {categories.map((c, i) => (
            <Link key={c.handle} to={`/collections/${c.handle}`} className={`tile ${i === 0 ? "tile--tall" : ""}`}>
              <Img id={c.image} alt="" ratio={i === 0 ? 1.3 : 0.8} sizes="(min-width: 900px) 33vw, 50vw" />
              <span className="tile__label">{c.title}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section section--hide" aria-labelledby="best-title">
        <div className="container">
          <div className="section-head">
            <h2 id="best-title">Best sellers</h2>
            <Link to="/collections/best-sellers" className="link">View all best sellers</Link>
          </div>
          {failed ? (
            <p className="muted">Best sellers couldn't load right now. <Link to="/collections/best-sellers" className="link">Open the full list</Link>.</p>
          ) : (
            <div className="product-grid" aria-busy={!bestSellers}>
              {bestSellers
                ? bestSellers.map((p) => <ProductCard key={p.id} product={p} />)
                : Array.from({ length: 5 }, (_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          )}
        </div>
      </section>

      <section className="section container split" aria-labelledby="craft-title">
        <Img id="1637868796504-32f45a96d5a0" alt="A leather bag, belt, wallet and boots laid out on a dark table" ratio={1.2} sizes="(min-width: 900px) 50vw, 100vw" className="split__img" />
        <div className="split__text">
          <h2 id="craft-title">Chosen to last</h2>
          <p className="lede">We started with leather jackets. Every piece we've added since meets the same test: will it still be worth wearing in ten years?</p>
          <dl className="facts">
            <div><dt>Full-grain leather</dt><dd>The strongest layer of the hide, in our jackets, shoes and straps.</dd></div>
            <div><dt>Movements you can service</dt><dd>Automatic and quartz watches that a local watchmaker can open and repair.</dd></div>
            <div><dt>UV400 lenses</dt><dd>Every pair of sunglasses blocks 100% of UVA and UVB light.</dd></div>
          </dl>
          <Link to="/pages/about" className="btn btn--outline">Read our story</Link>
        </div>
      </section>

      <section className="care-band" aria-labelledby="care-title">
        <Img id="1778882996728-952ed23dc6f4" alt="" ratio={0.45} sizes="100vw" className="care-band__img" />
        <div className="care-band__content container">
          <h2 id="care-title">Leather gets better with care</h2>
          <p>Ten minutes, twice a year. Our guide shows you how to clean, condition and store your jacket and shoes.</p>
          <Link to="/pages/leather-care" className="btn btn--light">Read the care guide</Link>
        </div>
      </section>

      <section className="section container promises" aria-label="Our promises">
        <div><h3>Free shipping</h3><p className="muted">On every order over $300, tracked to your door.</p></div>
        <div><h3>30-day returns</h3><p className="muted">Try it at home. If it's not right, send it back.</p></div>
        <div><h3>Repairs for life</h3><p className="muted">Broken zip, loose seam or worn sole? We fix our leather pieces free.</p></div>
      </section>
    </>
  );
}
