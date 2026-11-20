import { request } from "../lib/http";
import type { CategoryHandle, Product } from "./catalog";

export interface SearchPage {
  query: string;
  items: Product[];
  page: { limit: number; nextCursor: string | null; prevCursor: string | null };
  total: { value: number; capped: boolean };
}

export interface Suggestion {
  id: string;
  handle: string;
  name: string;
  category: CategoryHandle;
  colour: string;
  priceCents: number;
  image: string;
}

export function searchProducts(
  q: { q: string; category?: CategoryHandle; after?: string; before?: string; limit?: number },
  signal?: AbortSignal,
): Promise<SearchPage> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v) params.set(k, String(v));
  return request<SearchPage>(`/search?${params}`, { signal });
}

export function suggestProducts(q: string, signal?: AbortSignal): Promise<{ query: string; items: Suggestion[] }> {
  return request(`/search/suggest?q=${encodeURIComponent(q)}`, { signal });
}

export const POPULAR_SEARCHES = ["Leather biker", "Chelsea boots", "Aviator", "Chronograph", "White sneakers", "Oxford shirt"];

export const searchHref = (q: string) => `/search?q=${encodeURIComponent(q.trim())}`;
