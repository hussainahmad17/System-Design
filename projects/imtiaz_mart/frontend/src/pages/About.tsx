import { Link } from "react-router";
import Img from "../components/Img";
import "./content.css";

export default function About() {
  return (
    <>
      <header className="container page-head">
        <h1>About Imtiaz Mart</h1>
        <p>A small leather workshop making jackets one hide at a time.</p>
      </header>

      <section className="container section content-split">
        <div className="prose">
          <h2>Where we started</h2>
          <p>Imtiaz Mart began as a family workshop with two cutting tables and one rule: make a jacket you'd be proud to hand down. We still work that way. A single maker cuts, stitches and finishes each jacket, then signs the inside pocket.</p>
          <h2>What we use</h2>
          <p>We buy full-grain cowhide and lambskin from tanneries we visit in person. Full-grain is the top layer of the hide. It's the strongest part, and it's the only kind that builds a real patina as you wear it.</p>
          <h2>Why we repair for free</h2>
          <p>A good leather jacket should outlast every trend. If a seam opens or a zip fails, send it back and we'll fix it at no cost for as long as you own it.</p>
        </div>
        <aside className="content-split__aside">
          <Img id="1787070534639-8fc823677aff" alt="A maker tracing a paper pattern onto a leather hide" ratio={1.25} sizes="(min-width: 900px) 35vw, 100vw" />
        </aside>
      </section>

      <section className="section section--hide">
        <div className="container stats">
          <div><p className="stats__num">1 maker</p><p className="muted">per jacket, from first cut to final stitch</p></div>
          <div><p className="stats__num">30 days</p><p className="muted">to try it at home and return it</p></div>
          <div><p className="stats__num">For life</p><p className="muted">free repairs on every leather piece we sell</p></div>
        </div>
      </section>

      <section className="container section about-cta">
        <h2>Find your next piece</h2>
        <div className="empty__ctas">
          <Link to="/collections/best-sellers" className="btn btn--primary">Shop best sellers</Link>
          <Link to="/collections/leather-jackets" className="btn btn--outline">Shop leather jackets</Link>
        </div>
      </section>
    </>
  );
}
