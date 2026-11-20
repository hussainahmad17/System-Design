import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import Img from "../components/Img";
import Pager from "../components/Pager";
import ProductCard, { ProductCardSkeleton } from "../components/ProductCard";
import { collectionByHandle, fetchProducts, type CategoryHandle, type CollectionHandle, type ProductPage, type SortKey } from "../data/catalog";
import { ApiError } from "../lib/http";
import "../components/product-card.css";
import "./collection.css";
import NotFound from "./NotFound";

const PAGE_SIZE = 10;

const SORTS: { key: SortKey; label: string }[] = [
  { key: "best-selling", label: "Best selling" },
  { key: "newest", label: "Newest" },
  { key: "price-asc", label: "Price, low to high" },
  { key: "price-desc", label: "Price, high to low" },
];
const isSort = (v: string | null): v is SortKey => SORTS.some((s) => s.key === v);

// Each result remembers which request it answers. "Loading" is derived: the newest result
// doesn't match the current URL yet. No extra setState just to flag loading.
interface Result {
  key: string;
  data?: ProductPage;
  error?: { message: string; code?: string };
}

export default function Collection() {
  const { handle } = useParams();
  const collection = collectionByHandle.get(handle as CollectionHandle);
  const isBestSellers = collection?.handle === "best-sellers";

  // Everything that defines the page lives in the URL: ?sort=price-asc&after=<cursor>
  // Shareable, refresh-safe, and the browser Back button returns to the previous page.
  const [params, setParams] = useSearchParams();
  const sortParam = params.get("sort");
  const sort: SortKey = isBestSellers ? "best-selling" : isSort(sortParam) ? sortParam : "best-selling";
  const after = params.get("after") ?? undefined;
  const before = params.get("before") ?? undefined;
  const pageNo = Math.max(1, Number(params.get("p")) || 1); // display only; the cursor does the real work

  const [result, setResult] = useState<Result | null>(null);
  const [retry, setRetry] = useState(0);
  const listTop = useRef<HTMLDivElement>(null);
  const requestKey = [handle, sort, after, before, retry].join("|");

  useEffect(() => {
    if (!collection) return;
    const controller = new AbortController(); // cancel the old request if the user clicks again
    fetchProducts(
      {
        category: isBestSellers ? undefined : (collection.handle as CategoryHandle),
        sort,
        limit: PAGE_SIZE,
        after,
        before,
      },
      controller.signal,
    )
      .then((data) => setResult({ key: requestKey, data }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          error: { message: err instanceof ApiError ? err.message : "Couldn't load products.", code: err?.code },
        });
      });
    return () => controller.abort();
  }, [collection, isBestSellers, sort, after, before, requestKey]);

  if (!collection) return <NotFound />;

  const go = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    if (!isBestSellers && sort !== "best-selling") p.set("sort", sort);
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    setParams(p);
    listTop.current?.scrollIntoView({ block: "start" });
  };

  const loading = result?.key !== requestKey;
  const error = loading ? undefined : result?.error;
  // While the next page loads, keep showing the previous one (dimmed) if it was this collection's
  const data = result?.data && result.key.startsWith(`${handle}|`) ? result.data : undefined;

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
        <div className="toolbar" ref={listTop}>
          <p className="muted" aria-live="polite">
            {data ? `${data.total} products, page ${pageNo} of ${Math.ceil(data.total / PAGE_SIZE)}` : " "}
          </p>
          {!isBestSellers && (
            <label className="toolbar__sort">
              <span>Sort by</span>
              <select
                className="select"
                value={sort}
                onChange={(e) => {
                  const p = new URLSearchParams();
                  if (e.target.value !== "best-selling") p.set("sort", e.target.value);
                  setParams(p); // a new sort starts again at page 1: old cursors belong to the old order
                }}
              >
                {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>
          )}
        </div>

        {error ? (
          <div className="coll-error" role="alert">
            <p>{error.message}</p>
            {error.code === "INVALID_CURSOR" ? (
              <Link to={`/collections/${collection.handle}`} className="btn btn--outline">Go to the first page</Link>
            ) : (
              <button className="btn btn--outline" onClick={() => setRetry((n) => n + 1)}>Try again</button>
            )}
          </div>
        ) : (
          <div className={`product-grid ${loading && data ? "is-refreshing" : ""}`} aria-busy={loading}>
            {data
              ? data.items.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 2} />)
              : Array.from({ length: PAGE_SIZE }, (_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        )}

        {data && (
          <Pager
            pageNo={pageNo}
            hasPrev={!!data.page.prevCursor}
            hasNext={!!data.page.nextCursor}
            disabled={loading}
            onPrev={() => go({ before: data.page.prevCursor!, p: pageNo > 2 ? String(pageNo - 1) : undefined })}
            onNext={() => go({ after: data.page.nextCursor!, p: String(pageNo + 1) })}
          />
        )}
      </section>
    </>
  );
}
