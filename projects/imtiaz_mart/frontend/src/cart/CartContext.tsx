import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type { Product } from "../data/catalog";

// UI-only cart: lives in the browser until the backend cart API exists.
// Each line keeps a snapshot of the product (name, price, image) taken when it was added,
// because products now come from the API page by page; there is no full catalog in memory.
// The server must re-check prices at checkout: a snapshot can be stale or edited by the user.

export interface CartLine {
  productId: string;
  handle: string;
  name: string;
  colour: string;
  image: string;
  priceCents: number;
  size: string;
  qty: number;
}
export interface CartLineView extends CartLine {
  key: string;
  lineTotal: number;
}

type Action =
  | { type: "add"; product: Product; size: string }
  | { type: "setQty"; key: string; qty: number }
  | { type: "remove"; key: string }
  | { type: "clear" };

const MAX_QTY = 10;
const STORAGE_KEY = "im_cart_v2"; // v2: snapshot lines (v1 stored only ids from the old static catalog)
const lineKey = (l: Pick<CartLine, "productId" | "size">) => `${l.productId}:${l.size}`;

function reducer(lines: CartLine[], action: Action): CartLine[] {
  switch (action.type) {
    case "add": {
      const { product: p, size } = action;
      const key = lineKey({ productId: p.id, size });
      if (lines.some((l) => lineKey(l) === key)) {
        return lines.map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(l.qty + 1, MAX_QTY) } : l));
      }
      return [
        ...lines,
        { productId: p.id, handle: p.handle, name: p.name, colour: p.colour, image: p.image, priceCents: p.priceCents, size, qty: 1 },
      ];
    }
    case "setQty": {
      const qty = Math.max(1, Math.min(MAX_QTY, Math.floor(action.qty) || 1)); // validate input
      return lines.map((l) => (lineKey(l) === action.key ? { ...l, qty } : l));
    }
    case "remove":
      return lines.filter((l) => lineKey(l) !== action.key);
    case "clear":
      return [];
  }
}

const isLine = (l: unknown): l is CartLine => {
  const x = l as Partial<CartLine>;
  return (
    typeof x?.productId === "string" && typeof x.name === "string" && typeof x.image === "string" &&
    typeof x.size === "string" && Number.isInteger(x.priceCents) && Number.isInteger(x.qty) && x.qty! >= 1 && x.qty! <= MAX_QTY
  );
};

function load(): CartLine[] {
  try {
    localStorage.removeItem("im_cart_v1"); // old format, no longer readable
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isLine) : []; // drop stale or tampered lines
  } catch {
    return [];
  }
}

interface CartValue {
  lines: CartLineView[];
  count: number;
  subtotal: number; // cents
  add: (product: Product, size: string) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage full or blocked: cart still works for this visit */
    }
  }, [lines]);

  const value = useMemo<CartValue>(() => {
    const views = lines.map((l) => ({ ...l, key: lineKey(l), lineTotal: l.priceCents * l.qty }));
    return {
      lines: views,
      count: views.reduce((n, l) => n + l.qty, 0),
      subtotal: views.reduce((n, l) => n + l.lineTotal, 0),
      add: (product, size) => dispatch({ type: "add", product, size }),
      setQty: (key, qty) => dispatch({ type: "setQty", key, qty }),
      remove: (key) => dispatch({ type: "remove", key }),
      clear: () => dispatch({ type: "clear" }),
    };
  }, [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react/only-export-components
export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export const FREE_SHIPPING_FROM_CENTS = 300_00;
