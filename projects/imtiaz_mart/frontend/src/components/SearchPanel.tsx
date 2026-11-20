import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router";
import { categories, formatPrice } from "../data/catalog";
import { POPULAR_SEARCHES, searchHref, suggestProducts, type Suggestion } from "../data/search";
import { CloseIcon, SearchIcon } from "./Icons";
import Img from "./Img";
import "./search-panel.css";

const DEBOUNCE_MS = 200; // wait for a pause in typing before asking the server
const MIN_CHARS = 2;

interface Option {
  id: string;
  href: string;
  kind: "category" | "product" | "search";
  label: string;
  suggestion?: Suggestion;
}

/**
 * Search-as-you-type dropdown (ARIA combobox pattern).
 * Load control: debounce (1 request per pause, not per keystroke) + cancel stale requests
 * + server-side Redis cache per query + rate limit. Typing "sneakers" sends ~1-2 requests, not 8.
 */
export default function SearchPanel({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ query: string; items: Suggestion[] } | null>(null);
  const [active, setActive] = useState(-1);
  const navigate = useNavigate();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const query = text.trim().toLowerCase();
  const ready = query.length >= MIN_CHARS;

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      suggestProducts(query, controller.signal)
        .then((r) => setResult(r))
        .catch(() => {}); // suggestions are optional; the full search still works
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort(); // the user typed again: drop the old request
    };
  }, [query, ready]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Category names match instantly on the client (no request needed)
  const categoryMatches = ready
    ? categories.filter((c) => c.title.toLowerCase().includes(query) || query.includes(c.navLabel.toLowerCase().replace(/s$/, "")))
    : [];
  const products = ready && result?.query === query ? result.items : [];
  const loading = ready && result?.query !== query;

  const options: Option[] = ready
    ? [
        ...categoryMatches.map((c) => ({ id: `c-${c.handle}`, href: `/collections/${c.handle}`, kind: "category" as const, label: c.title })),
        ...products.map((p) => ({ id: `p-${p.id}`, href: searchHref(p.name), kind: "product" as const, label: p.name, suggestion: p })),
        { id: "search", href: searchHref(text), kind: "search" as const, label: `Search for “${text.trim()}”` },
      ]
    : [];

  const go = (href: string) => {
    navigate(href);
    onClose();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (active >= 0 && options[active]) return go(options[active].href);
    if (ready) go(searchHref(text));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") return onClose();
    if (!options.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    }
  };

  const optionId = (o: Option) => `${listId}-${o.id}`;

  return (
    <div className="search-panel" role="dialog" aria-modal="true" aria-label="Search the store">
      <div className="search-panel__scrim" onClick={onClose} />
      <div className="search-panel__sheet">
        <form className="container search-panel__form" role="search" onSubmit={onSubmit}>
          <SearchIcon />
          <input
            ref={inputRef}
            className="search-panel__input"
            type="search"
            placeholder="Search jackets, shoes, watches…"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setActive(-1);
            }}
            onKeyDown={onKeyDown}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            maxLength={80}
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls={listId}
            aria-activedescendant={active >= 0 && options[active] ? optionId(options[active]) : undefined}
            aria-autocomplete="list"
            aria-label="Search products"
          />
          <button type="button" className="icon-btn" aria-label="Close search" onClick={onClose}>
            <CloseIcon />
          </button>
        </form>

        <div className="container search-panel__body">
          {!ready ? (
            <div className="search-panel__popular">
              <p className="muted">Popular searches</p>
              <div className="chips">
                {POPULAR_SEARCHES.map((s) => (
                  <Link key={s} to={searchHref(s)} className="chip" onClick={onClose}>{s}</Link>
                ))}
              </div>
            </div>
          ) : (
            <ul id={listId} role="listbox" className="suggestions" aria-label="Suggestions" aria-busy={loading}>
              {options.map((o, i) => (
                <li
                  key={o.id}
                  id={optionId(o)}
                  role="option"
                  aria-selected={i === active}
                  className={`suggestion suggestion--${o.kind}`}
                  onMouseDown={(e) => e.preventDefault()} // keep focus in the input
                  onClick={() => go(o.href)}
                  onMouseEnter={() => setActive(i)}
                >
                  {o.suggestion ? (
                    <>
                      <Img id={o.suggestion.image} alt="" ratio={1.25} sizes="48px" className="suggestion__img" />
                      <span className="suggestion__text">
                        <span>{o.suggestion.name}</span>
                        <span className="muted">{o.suggestion.colour}</span>
                      </span>
                      <span className="suggestion__price">{formatPrice(o.suggestion.priceCents)}</span>
                    </>
                  ) : o.kind === "category" ? (
                    <span className="suggestion__text"><span>{o.label}</span><span className="muted">Category</span></span>
                  ) : (
                    <span className="suggestion__text suggestion__all"><SearchIcon /> {o.label}</span>
                  )}
                </li>
              ))}
              {!loading && products.length === 0 && (
                <li className="suggestion suggestion--empty muted" role="presentation">
                  No quick matches. Press Enter to search everything.
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
