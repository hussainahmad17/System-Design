import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";
import { collections } from "../data/catalog";
import { BagIcon, CloseIcon, MenuIcon, SearchIcon, UserIcon } from "./Icons";
import Logo from "./Logo";
import "./layout.css";

// The search panel's code downloads only when someone opens search
const SearchPanel = lazy(() => import("./SearchPanel"));

// Header holds shopping only. Help pages live in the footer so the main nav stays short.
export default function Header() {
  const { count } = useCart();
  const { status, user } = useAuth();
  const { pathname, search } = useLocation();
  const here = pathname + search;
  // Remember which page each overlay was opened on. Navigating changes the path, so they close
  // by themselves: derived state, no extra render.
  const [menuAt, setMenuAt] = useState<string | null>(null);
  const [searchAt, setSearchAt] = useState<string | null>(null);
  const menuOpen = menuAt === pathname;
  const searchOpen = searchAt === here;
  const searchButton = useRef<HTMLButtonElement>(null);

  const closeSearch = () => {
    setSearchAt(null);
    searchButton.current?.focus(); // put keyboard focus back where it was
  };

  useEffect(() => {
    if (!menuOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuAt(null);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // "/" opens search from anywhere (a common shop shortcut), unless the user is typing in a field
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable]");
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setSearchAt(window.location.pathname + window.location.search);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <p className="announce">Free shipping on orders over $300, and free repairs for life</p>
      <header className="header">
        <div className="container header__inner">
          <button className="icon-btn header__menu" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuAt(pathname)}>
            <MenuIcon />
          </button>

          <nav className="header__nav" aria-label="Shop">
            {collections.map((c) => (
              <NavLink key={c.handle} to={`/collections/${c.handle}`} className="nav-link">
                {c.navLabel}
              </NavLink>
            ))}
          </nav>

          <Link to="/" className="header__logo" aria-label="Scale Cart home">
            <Logo />
          </Link>

          <div className="header__actions">
            <button
              ref={searchButton}
              className="icon-btn"
              aria-label="Search"
              aria-expanded={searchOpen}
              aria-keyshortcuts="/"
              onClick={() => setSearchAt(here)}
            >
              <SearchIcon />
            </button>
            <Link
              to={status === "authed" ? "/account" : "/account/login"}
              className="icon-btn"
              aria-label={status === "authed" && user ? `Account, signed in as ${user.firstName}` : "Sign in"}
            >
              <UserIcon />
            </Link>
            <Link to="/cart" className="icon-btn cart-btn" aria-label={`Cart, ${count} items`}>
              <BagIcon />
              {count > 0 && <span className="cart-count">{count}</span>}
            </Link>
          </div>
        </div>
      </header>

      {searchOpen && (
        <Suspense fallback={null}>
          <SearchPanel onClose={closeSearch} />
        </Suspense>
      )}

      <div className={`drawer ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen} inert={!menuOpen}>
        <div className="drawer__scrim" onClick={() => setMenuAt(null)} />
        <nav className="drawer__panel" aria-label="Menu">
          <button className="icon-btn drawer__close" aria-label="Close menu" onClick={() => setMenuAt(null)}>
            <CloseIcon />
          </button>
          <ul className="drawer__primary">
            {collections.map((c) => (
              <li key={c.handle}>
                <Link to={`/collections/${c.handle}`}>{c.title}</Link>
              </li>
            ))}
          </ul>
          <ul className="drawer__secondary">
            <li><Link to="/pages/leather-care">Leather care guide</Link></li>
            <li><Link to="/pages/track-order">Track your order</Link></li>
            <li><Link to="/pages/faq">FAQ</Link></li>
            <li><Link to="/pages/about">About us</Link></li>
            <li><Link to="/pages/contact">Contact us</Link></li>
            <li>{status === "authed" ? <Link to="/account">My account</Link> : <Link to="/account/login">Sign in</Link>}</li>
          </ul>
        </nav>
      </div>
    </>
  );
}
