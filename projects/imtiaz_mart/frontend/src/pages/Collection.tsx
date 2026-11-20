import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import Img from "../components/Img";
import ProductCard from "../components/ProductCard";
import { collectionByHandle, productsInCollection, type CollectionHandle, type Product } from "../data/catalog";
import "../components/product-card.css";
import "./collection.css";
import NotFound from "./NotFound";

const PAGE_SIZE = 8;

const SORTS = {
  featured: { label: "Featured", fn: null },
  "price-asc": { label: "Price, low to high", fn: (a: Product, b: Product) => a.price - b.price },
  "price-desc": { label: "Price, high to low", fn: (a: Product, b: Product) => b.price - a.price },
  newest: { label: "Newest", fn: (a: Product, b: Product) => b.createdAt.localeCompare(a.createdAt) },
} as const;
type SortKey = keyof typeof SORTS;
const isSortKey = (v: string | null): v is SortKey => v !== null && v in SORTS;

export default function Collection() {
  const { handle } = useParams();
  const collection = collectionByHandle.get(handle as CollectionHandle);

  // Sort and page live in the URL (?sort=price-asc&page=2): shareable, and the back button works
  const [params, setParams] = useSearchParams();
  const sortParam = params.get("sort");
  const sort: SortKey = isSortKey(sortParam) ? sortParam : "featured";

  const sorted = useMemo(() => {
    if (!collection) return [];
    const list = productsInCollection(collection.handle);
    const fn = SORTS[sort].fn;
    return fn ? [...list].sort(fn) : list; // O(n log n), recomputed only when collection or sort changes
  }, [collection, sort]);

  if (!collection) return <NotFound />;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const rawPage = Number(params.get("page"));
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? Math.min(rawPage, totalPages) : 1; // validate
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const update = (next: Record<string, string>) => {
    const p = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => p.set(k, v));
    setParams(p);
  };
  const pageHref = (n: number) => {
    const p = new URLSearchParams(params);
    p.set("page", String(n));
    return `?${p}`;
  };

  return (
    <>
      <section className="coll-hero">
        <Img id={collection.image} alt="" ratio={0.4} sizes="100vw" priority className="coll-hero__img" />
        <div className="coll-hero__content container">
          <h1>{collection.title}</h1>
          <p>{collection.description}</p>
        </div>
      </section>

      <section className="container section coll-body" aria-label="Products">
        <div className="toolbar">
          <p className="muted">{sorted.length} jackets</p>
          <label className="toolbar__sort">
            <span>Sort by</span>
            <select className="select" value={sort} onChange={(e) => update({ sort: e.target.value, page: "1" })}>
              {Object.entries(SORTS).map(([key, s]) => (
                <option key={key} value={key}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="product-grid">
          {visible.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>

        {totalPages > 1 && (
          <nav className="pagination" aria-label="Pages">
            {page > 1 && <Link to={pageHref(page - 1)} className="pagination__step">Previous</Link>}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <Link key={n} to={pageHref(n)} className="pagination__num" aria-current={n === page ? "page" : undefined}>
                {n}
              </Link>
            ))}
            {page < totalPages && <Link to={pageHref(page + 1)} className="pagination__step">Next</Link>}
          </nav>
        )}
      </section>
    </>
  );
}
