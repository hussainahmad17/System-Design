import { Link } from "react-router";
import Img from "../components/Img";
import ProductCard from "../components/ProductCard";
import { collectionByHandle, productsInCollection, type CollectionHandle } from "../data/catalog";
import "../components/product-card.css";
import "./home.css";

const STYLE_TILES: CollectionHandle[] = ["men", "women", "biker", "bomber"];

export default function Home() {
  const bestSellers = productsInCollection("best-sellers").slice(0, 4);

  return (
    <>
      {/* Hero: the only priority image on the page */}
      <section className="hero">
        <Img id="1760533091973-1262bf57d244" alt="A rack of leather jackets in cognac, chestnut, black and suede" ratio={0.6} priority className="hero__img" />
        <div className="hero__content container">
          <h1 className="hero__title">Full-grain leather, cut and stitched by hand</h1>
          <p className="hero__text">Jackets that soften, darken and shape to you over decades of wear.</p>
          <div className="hero__ctas">
            <Link to="/collections/men" className="btn btn--light">Shop men</Link>
            <Link to="/collections/women" className="btn btn--light">Shop women</Link>
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="styles-title">
        <h2 id="styles-title">Shop by style</h2>
        <div className="tiles">
          {STYLE_TILES.map((handle, i) => {
            const c = collectionByHandle.get(handle)!;
            return (
              <Link key={handle} to={`/collections/${handle}`} className={`tile ${i === 0 ? "tile--tall" : ""}`}>
                <Img id={c.image} alt="" ratio={i === 0 ? 1.3 : 0.8} sizes="(min-width: 900px) 50vw, 100vw" />
                <span className="tile__label">{c.title}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section section--hide" aria-labelledby="best-title">
        <div className="container">
          <div className="section-head">
            <h2 id="best-title">Best sellers</h2>
            <Link to="/collections/best-sellers" className="link">View all best sellers</Link>
          </div>
          <div className="product-grid">
            {bestSellers.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      <section className="section container split" aria-labelledby="craft-title">
        <Img id="1787005241178-c9006ea9610b" alt="A craftsman tracing a paper pattern onto a brown leather hide" ratio={1.1} sizes="(min-width: 900px) 50vw, 100vw" className="split__img" />
        <div className="split__text">
          <h2 id="craft-title">Made the slow way</h2>
          <p className="lede">Each jacket starts as a single hide, chosen by hand and cut by one maker from start to finish.</p>
          <dl className="facts">
            <div><dt>Full-grain hides</dt><dd>The strongest layer of the hide, never sanded or coated.</dd></div>
            <div><dt>Saddle-stitched seams</dt><dd>Two needles, one waxed thread. If a stitch breaks, the seam holds.</dd></div>
            <div><dt>Solid brass hardware</dt><dd>Zips and snaps that won't rust, chip or snag.</dd></div>
          </dl>
          <Link to="/pages/about" className="btn btn--outline">Read our story</Link>
        </div>
      </section>

      <section className="care-band" aria-labelledby="care-title">
        <Img id="1778882996728-952ed23dc6f4" alt="" ratio={0.45} sizes="100vw" className="care-band__img" />
        <div className="care-band__content container">
          <h2 id="care-title">Leather gets better with care</h2>
          <p>Ten minutes, twice a year. Our guide shows you how to clean, condition and store your jacket.</p>
          <Link to="/pages/leather-care" className="btn btn--light">Read the care guide</Link>
        </div>
      </section>

      <section className="section container promises" aria-label="Our promises">
        <div><h3>Free shipping</h3><p className="muted">On every order over $300, tracked to your door.</p></div>
        <div><h3>30-day returns</h3><p className="muted">Wear it at home. If it's not right, send it back.</p></div>
        <div><h3>Repairs for life</h3><p className="muted">Broken zip or loose seam? We fix it free, for as long as you own it.</p></div>
      </section>
    </>
  );
}
