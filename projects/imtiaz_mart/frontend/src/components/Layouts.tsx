import { Suspense } from "react";
import { Link, Outlet, ScrollRestoration } from "react-router";
import Footer from "./Footer";
import Header from "./Header";

function PageLoading() {
  return <div className="page-loading" role="status" aria-label="Loading page" />;
}

// Storefront: full header and footer
export function StoreLayout() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <ScrollRestoration />
    </>
  );
}

// Checkout: logo only, no menu. Fewer exits means fewer abandoned checkouts (the Shopify pattern).
export function CheckoutLayout() {
  return (
    <>
      <header className="checkout-header">
        <div className="container checkout-header__inner">
          <Link to="/" className="wordmark">Imtiaz Mart</Link>
          <Link to="/cart" className="link">Back to cart</Link>
        </div>
      </header>
      <main id="main">
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <ScrollRestoration />
    </>
  );
}
