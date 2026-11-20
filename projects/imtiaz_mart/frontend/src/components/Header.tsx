import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { useCart } from "../cart/CartContext";
import { collections } from "../data/catalog";
import { BagIcon, CloseIcon, MenuIcon, UserIcon } from "./Icons";
import "./layout.css";

// Header holds shopping only. Help pages live in the footer so the main nav stays short.
export default function Header() {
  const { count } = useCart();
  const { status, user } = useAuth();
  const { pathname } = useLocation();
  // Remember which page the menu was opened on. Navigating changes the path, so the menu closes
  // by itself: derived state, no extra render.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const setOpen = (v: boolean) => setOpenedAt(v ? pathname : null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenedAt(null);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <p className="announce">Free shipping on orders over $300, and free repairs for life</p>
      <header className="header">
        <div className="container header__inner">
          <button className="icon-btn header__menu" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <MenuIcon />
          </button>

          <nav className="header__nav" aria-label="Shop">
            {collections.map((c) => (
              <NavLink key={c.handle} to={`/collections/${c.handle}`} className="nav-link">
                {c.navLabel}
              </NavLink>
            ))}
          </nav>

          <Link to="/" className="wordmark" aria-label="Imtiaz Mart home">
            Imtiaz Mart
          </Link>

          <div className="header__actions">
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

      <div className={`drawer ${open ? "is-open" : ""}`} aria-hidden={!open} inert={!open}>
        <div className="drawer__scrim" onClick={() => setOpen(false)} />
        <nav className="drawer__panel" aria-label="Menu">
          <button className="icon-btn drawer__close" aria-label="Close menu" onClick={() => setOpen(false)}>
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
