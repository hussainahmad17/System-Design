import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { SearchIcon } from "../components/Icons";
import Pager from "../components/Pager";
import ProductCard, { ProductCardSkeleton } from "../components/ProductCard";
import { categories, type CategoryHandle } from "../data/catalog";
import { POPULAR_SEARCHES, searchHref, searchProducts, type SearchPage } from "../data/search";
import { ApiError } from "../lib/http";
import "../components/product-card.css";
import "../components/search-panel.css";
import "./collection.css";
import "./search.css";

const PAGE_SIZE = 10;

interface Result {
  key: string;
  data?: SearchPage;
  error?: { message: string; code?: string };
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const q = (params.get("q") ?? "").trim();
  const categoryParam = params.get("category");
  const category = categories.some((c) => c.handle === categoryParam) ? (categoryParam as CategoryHandle) : undefined;
  const after = params.get("after") ?? undefined;
  const before = params.get("before") ?? undefined;
  const pageNo = Math.max(1, Number(params.get("p")) || 1);

  const [result, setResult] = useState<Result | null>(null);
  const [retry, setRetry] = useState(0);
  const listTop = useRef<HTMLDivElement>(null);
  const requestKey = [q, category, after, before, retry].join("|");
  const valid = q.length >= 2;

  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    searchProducts({ q, category, after, before, limit: PAGE_SIZE }, controller.signal)
      .then((data) => setResult({ key: requestKey, data }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setResult({ key: requestKey, error: { message: err instanceof ApiError ? err.message : "Search failed.", code: err?.code } });
      });
    return () => controller.abort();
  }, [q, category, after, before, requestKey, valid]);

  const loading = valid && result?.key !== requestKey;
  const error = loading ? undefined : result?.error;
  const data = result?.data && result.key.startsWith(`${q}|`) ? result.data : undefined;

  const setQuery = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ q });
    if (category) p.set("category", category);
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    setParams(p);
    listTop.current?.scrollIntoView({ block: "start" });
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    if (text.length >= 2) navigate(searchHref(text));
  };

  const total = data?.total;
  const countText = total ? `${total.capped ? `${total.value}+` : total.value} result${total.value === 1 ? "" : "s"}` : "";

  return (
    <section className="container section search-page">
      <form className="search-page__form" role="search" onSubmit={onSubmit} key={q}>
        <SearchIcon />
        <input
          name="q"
          type="search"
          className="search-page__input"
          defaultValue={q}
          placeholder="Search jackets, shoes, watches…"
          aria-label="Search products"
          minLength={2}
          maxLength={80}
          autoComplete="off"
        />
        <button className="btn btn--primary" type="submit">Search</button>
      </form>

      {!valid ? (
        <div className="search-empty">
          <h1>Search the store</h1>
          <p className="lede">Type at least 2 characters, or try one of these:</p>
          <div className="chips">{POPULAR_SEARCHES.map((s) => <Link key={s} className="chip" to={searchHref(s)}>{s}</Link>)}</div>
        </div>
      ) : (
        <>
          <div className="search-page__head" ref={listTop}>
            <h1>Results for “{q}”</h1>
            <p className="muted" aria-live="polite">{data ? `${countText}${pageNo > 1 ? `, page ${pageNo}` : ""}` : " "}</p>
          </div>

          <div className="chips search-page__filters" role="group" aria-label="Filter by category">
            <button className="chip" aria-pressed={!category} onClick={() => setQuery({ category: undefined, after: undefined, before: undefined, p: undefined })}>
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.handle}
                className="chip"
                aria-pressed={category === c.handle}
                onClick={() => setQuery({ category: c.handle, after: undefined, before: undefined, p: undefined })}
              >
                {c.title}
              </button>
            ))}
          </div>

          {error ? (
            <div className="coll-error" role="alert">
              <p>{error.message}</p>
              {error.code === "INVALID_CURSOR" ? (
                <Link to={searchHref(q)} className="btn btn--outline">Back to the first page</Link>
              ) : (
                <button className="btn btn--outline" onClick={() => setRetry((n) => n + 1)}>Try again</button>
              )}
            </div>
          ) : data && data.items.length === 0 && !loading ? (
            <div className="search-empty">
              <p className="lede">
                No products match “{q}”{category ? ` in ${categories.find((c) => c.handle === category)?.title}` : ""}.
              </p>
              <p>Check the spelling, use fewer words, or try one of these:</p>
              <div className="chips">{POPULAR_SEARCHES.map((s) => <Link key={s} className="chip" to={searchHref(s)}>{s}</Link>)}</div>
            </div>
          ) : (
            <div className={`product-grid ${loading && data ? "is-refreshing" : ""}`} aria-busy={loading}>
              {data
                ? data.items.map((p, i) => <ProductCard key={p.id} product={p} priority={i < 2} />)
                : Array.from({ length: PAGE_SIZE }, (_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          )}

          {data && !error && (
            <Pager
              pageNo={pageNo}
              hasPrev={!!data.page.prevCursor}
              hasNext={!!data.page.nextCursor}
              disabled={loading}
              onPrev={() => setQuery({ before: data.page.prevCursor!, after: undefined, p: pageNo > 2 ? String(pageNo - 1) : undefined })}
              onNext={() => setQuery({ after: data.page.nextCursor!, before: undefined, p: String(pageNo + 1) })}
            />
          )}
        </>
      )}
    </section>
  );
}
