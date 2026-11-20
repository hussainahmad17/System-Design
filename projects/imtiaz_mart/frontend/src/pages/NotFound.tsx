import { Link } from "react-router";

export default function NotFound() {
  return (
    <section className="container section" style={{ textAlign: "center", minHeight: "50vh" }}>
      <h1>We couldn't find that page</h1>
      <p className="lede" style={{ marginInline: "auto" }}>The link may be old, or the jacket may have sold out.</p>
      <Link to="/" className="btn btn--primary">Go to the home page</Link>
    </section>
  );
}
