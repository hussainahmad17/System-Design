import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { productById, type Product, type Size } from "../data/catalog";

// UI-only cart: lives in the browser until the backend cart API exists.

export interface CartLine {
  productId: string;
  size: Size;
  qty: number;
}
export interface CartLineView extends CartLine {
  key: string;
  product: Product;
  lineTotal: number;
}

type Action =
  | { type: "add"; productId: string; size: Size }
  | { type: "setQty"; key: string; qty: number }
  | { type: "remove"; key: string }
  | { type: "clear" };

const MAX_QTY = 10;
const STORAGE_KEY = "im_cart_v1";
const lineKey = (l: Pick<CartLine, "productId" | "size">) => `${l.productId}:${l.size}`;

function reducer(lines: CartLine[], action: Action): CartLine[] {
  switch (action.type) {
    case "add": {
      const key = lineKey(action);
      const existing = lines.find((l) => lineKey(l) === key);
      if (existing) {
        return lines.map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(l.qty + 1, MAX_QTY) } : l));
      }
      return [...lines, { productId: action.productId, size: action.size, qty: 1 }];
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

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // Drop anything that no longer matches the catalog (stale or tampered data)
    return parsed.filter(
      (l): l is CartLine => typeof l?.productId === "string" && productById.has(l.productId) && typeof l.qty === "number",
    );
  } catch {
    return [];
  }
}

interface CartValue {
  lines: CartLineView[];
  count: number;
  subtotal: number;
  add: (productId: string, size: Size) => void;
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
    const views = lines.flatMap((l) => {
      const product = productById.get(l.productId); // O(1) per line
      return product ? [{ ...l, key: lineKey(l), product, lineTotal: product.price * l.qty }] : [];
    });
    return {
      lines: views,
      count: views.reduce((n, l) => n + l.qty, 0),
      subtotal: views.reduce((n, l) => n + l.lineTotal, 0),
      add: (productId, size) => dispatch({ type: "add", productId, size }),
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

export const FREE_SHIPPING_FROM = 300;
