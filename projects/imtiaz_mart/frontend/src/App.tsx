import { lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { AuthProvider } from "./auth/AuthContext";
import { CartProvider } from "./cart/CartContext";
import { CheckoutLayout, StoreLayout } from "./components/Layouts";

// Route-level code splitting: each page is its own JS chunk, downloaded only when visited.
// The home page ships first; the FAQ code never loads for someone who never opens the FAQ.
const Home = lazy(() => import("./pages/Home"));
const Collection = lazy(() => import("./pages/Collection"));
const Auth = lazy(() => import("./pages/Auth"));
const Account = lazy(() => import("./pages/Account"));
const Cart = lazy(() => import("./pages/Cart"));
const Search = lazy(() => import("./pages/Search"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CareGuide = lazy(() => import("./pages/CareGuide"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Faq = lazy(() => import("./pages/Faq"));
const TrackOrder = lazy(() => import("./pages/TrackOrder"));
const NotFound = lazy(() => import("./pages/NotFound"));

// URLs follow Shopify conventions: /collections/<handle>, /pages/<handle>, /account/...
const router = createBrowserRouter([
  {
    element: <StoreLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/collections/:handle", element: <Collection /> },
      { path: "/account", element: <Account /> },
      { path: "/account/login", element: <Auth mode="login" /> },
      { path: "/account/register", element: <Auth mode="register" /> },
      { path: "/search", element: <Search /> },
      { path: "/cart", element: <Cart /> },
      { path: "/pages/leather-care", element: <CareGuide /> },
      { path: "/pages/about", element: <About /> },
      { path: "/pages/contact", element: <Contact /> },
      { path: "/pages/faq", element: <Faq /> },
      { path: "/pages/track-order", element: <TrackOrder /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  {
    element: <CheckoutLayout />,
    children: [{ path: "/checkout", element: <Checkout /> }],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <RouterProvider router={router} />
      </CartProvider>
    </AuthProvider>
  );
}

// Dev only: the route table lives inside a router created once at startup, so a hot swap of
// this file leaves the running app on the OLD routes (new pages show "not found").
// invalidate() passes the update up to main.tsx, which can't hot-swap, so Vite reloads the page.
if (import.meta.hot) import.meta.hot.accept(() => import.meta.hot?.invalidate("Routes changed: full reload"));
