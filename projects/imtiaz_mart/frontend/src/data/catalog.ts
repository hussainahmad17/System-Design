// Category config (static: changes rarely, needed instantly for the nav) and the products API.
// Product data itself lives in MongoDB and is fetched page by page.
import { request } from "../lib/http";

export type CategoryHandle = "leather-jackets" | "shoes" | "watches" | "sunglasses" | "clothing";
export type CollectionHandle = CategoryHandle | "best-sellers";

export interface Collection {
  handle: CollectionHandle;
  title: string;
  navLabel: string;
  description: string;
  image: string; // Unsplash photo id
}

export const collections: Collection[] = [
  { handle: "leather-jackets", title: "Leather jackets", navLabel: "Leather", description: "Bikers, bombers and field jackets in full-grain cowhide and lambskin.", image: "1727518154538-59e7dc479f8f" },
  { handle: "shoes", title: "Shoes", navLabel: "Shoes", description: "Leather oxfords, loafers, boots and clean everyday sneakers.", image: "1761511110765-7c26f5412ebd" },
  { handle: "watches", title: "Watches", navLabel: "Watches", description: "Chronographs, divers and dress watches with automatic and quartz movements.", image: "1772638904164-eed7c6b1e57e" },
  { handle: "sunglasses", title: "Sunglasses", navLabel: "Sunglasses", description: "Aviators, wayfarers and round frames with UV400 lenses.", image: "1758552322632-ba288778c770" },
  { handle: "clothing", title: "Clothing", navLabel: "Clothing", description: "Shirts, knits, blazers and tees cut from cotton, wool and linen.", image: "1441984904996-e0b6ba687e04" },
  { handle: "best-sellers", title: "Best sellers", navLabel: "Best sellers", description: "The pieces our customers reorder, gift and pass down.", image: "1760533091973-1262bf57d244" },
];

export const collectionByHandle = new Map(collections.map((c) => [c.handle, c]));
export const categories = collections.filter((c) => c.handle !== "best-sellers");

export interface Product {
  id: string;
  handle: string;
  name: string;
  category: CategoryHandle;
  gender: "men" | "women" | "unisex";
  style: string;
  colour: string;
  priceCents: number;
  compareAtCents?: number;
  image: string;
  sizes: string[];
}

export type SortKey = "best-selling" | "newest" | "price-asc" | "price-desc";

export interface ProductPage {
  items: Product[];
  page: { limit: number; nextCursor: string | null; prevCursor: string | null };
  total: number;
}

export function fetchProducts(
  q: { category?: CategoryHandle; sort?: SortKey; limit?: number; after?: string; before?: string },
  signal?: AbortSignal,
): Promise<ProductPage> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  return request<ProductPage>(`/products?${params}`, { signal });
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const formatPrice = (cents: number) => money.format(cents / 100);
