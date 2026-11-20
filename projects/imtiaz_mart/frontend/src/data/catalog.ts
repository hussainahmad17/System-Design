// Dummy catalog. This moves to the backend API later; the shapes stay the same.

export type CollectionHandle = "men" | "women" | "biker" | "bomber" | "best-sellers";

export interface Product {
  id: string;
  handle: string;
  name: string;
  colour: string;
  price: number; // whole dollars
  compareAt?: number; // original price when on sale
  image: string; // Unsplash photo id
  collections: CollectionHandle[];
  bestSellerRank?: number; // lower = sells more
  createdAt: string; // ISO date, used for "Newest" sort
}

export interface Collection {
  handle: CollectionHandle;
  title: string;
  description: string;
  image: string;
}

export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type Size = (typeof SIZES)[number];

export const collections: Collection[] = [
  {
    handle: "men",
    title: "Men's jackets",
    description: "Riders, bombers and field jackets in full-grain cowhide and lambskin.",
    image: "1521223890158-f9f7c3d5d504",
  },
  {
    handle: "women",
    title: "Women's jackets",
    description: "Tailored bikers, cropped bombers and soft oversized cuts.",
    image: "1602370463198-086436840055",
  },
  {
    handle: "biker",
    title: "Biker jackets",
    description: "Asymmetric zips, snap lapels and belted waists. Built to be worn hard.",
    image: "1727518154538-59e7dc479f8f",
  },
  {
    handle: "bomber",
    title: "Bomber jackets",
    description: "Ribbed cuffs, roomy bodies and leather that breaks in within weeks.",
    image: "1591047139829-d91aecb6caea",
  },
  {
    handle: "best-sellers",
    title: "Best sellers",
    description: "The jackets our customers reorder, gift and pass down.",
    image: "1760533091973-1262bf57d244",
  },
];

// O(1) lookup by handle instead of scanning the array on every render
export const collectionByHandle = new Map(collections.map((c) => [c.handle, c]));

export const products: Product[] = [
  { id: "p01", handle: "ashford-biker", name: "Ashford biker", colour: "Black", price: 489, image: "1551028719-00167b16eac5", collections: ["men", "biker"], bestSellerRank: 1, createdAt: "2026-03-02" },
  { id: "p02", handle: "hollis-cafe-racer", name: "Hollis café racer", colour: "Walnut brown", price: 459, image: "1578198576866-7e0ba6078128", collections: ["men", "biker"], bestSellerRank: 4, createdAt: "2026-05-11" },
  { id: "p03", handle: "marlow-rider", name: "Marlow rider", colour: "Black", price: 519, image: "1675877879221-871aa9f7c314", collections: ["men", "biker"], createdAt: "2026-08-20" },
  { id: "p04", handle: "cole-field-jacket", name: "Cole field jacket", colour: "Tobacco", price: 429, compareAt: 495, image: "1623854156816-4c4fc355ffc7", collections: ["men"], createdAt: "2026-01-14" },
  { id: "p05", handle: "stratton-bomber", name: "Stratton bomber", colour: "Cognac", price: 449, image: "1591047139829-d91aecb6caea", collections: ["men", "bomber"], bestSellerRank: 2, createdAt: "2026-02-08" },
  { id: "p06", handle: "dalton-bomber", name: "Dalton bomber", colour: "Sand suede", price: 399, image: "1774413768759-d3cc719c1a0e", collections: ["men", "bomber"], createdAt: "2026-09-03" },
  { id: "p07", handle: "rowan-moto", name: "Rowan moto", colour: "Black", price: 535, image: "1605268845395-15828acd992e", collections: ["men", "biker"], bestSellerRank: 6, createdAt: "2026-04-19" },
  { id: "p08", handle: "everett-trucker", name: "Everett trucker", colour: "Black", price: 410, image: "1521223890158-f9f7c3d5d504", collections: ["men"], createdAt: "2026-06-27" },
  { id: "p09", handle: "kingsley-flight-bomber", name: "Kingsley flight bomber", colour: "Black", price: 479, image: "1602525582399-7ef5f604ff7e", collections: ["men", "bomber"], createdAt: "2026-10-01" },
  { id: "p10", handle: "harlan-racer", name: "Harlan racer", colour: "Black", price: 469, compareAt: 540, image: "1615908280461-d7a332579330", collections: ["men", "biker"], createdAt: "2025-12-05" },
  { id: "p11", handle: "vera-biker", name: "Vera biker", colour: "Black", price: 465, image: "1602370463198-086436840055", collections: ["women", "biker"], bestSellerRank: 3, createdAt: "2026-02-21" },
  { id: "p12", handle: "celeste-moto", name: "Celeste moto", colour: "Black", price: 495, image: "1511280303142-0051e93baeeb", collections: ["women", "biker"], createdAt: "2026-07-15" },
  { id: "p13", handle: "margot-cropped-bomber", name: "Margot cropped bomber", colour: "Black", price: 385, image: "1777293875577-da93247013f2", collections: ["women", "bomber"], createdAt: "2026-09-28" },
  { id: "p14", handle: "iris-bomber", name: "Iris bomber", colour: "Olive", price: 375, compareAt: 430, image: "1760126070359-5b82710274fe", collections: ["women", "bomber"], createdAt: "2026-03-30" },
  { id: "p15", handle: "sienna-racer", name: "Sienna racer", colour: "Chestnut", price: 455, image: "1619731428826-a535570610b1", collections: ["women", "biker"], bestSellerRank: 5, createdAt: "2026-05-02" },
  { id: "p16", handle: "noor-belted-biker", name: "Noor belted biker", colour: "Black", price: 509, image: "1594803617043-2a5a0829fcd9", collections: ["women", "biker"], createdAt: "2026-10-12" },
  { id: "p17", handle: "elodie-classic", name: "Elodie classic", colour: "Black", price: 439, image: "1615397815341-bb06f6d55c94", collections: ["women"], createdAt: "2026-01-29" },
  { id: "p18", handle: "lena-oversized", name: "Lena oversized", colour: "Black", price: 475, image: "1600738454937-ca47a196172c", collections: ["women"], bestSellerRank: 7, createdAt: "2026-06-06" },
  { id: "p19", handle: "ada-slim", name: "Ada slim", colour: "Black", price: 420, image: "1568631982221-1fb409cbde0e", collections: ["women"], createdAt: "2026-08-08" },
  { id: "p20", handle: "juno-moto", name: "Juno moto", colour: "Black", price: 445, image: "1719433227957-ef57ac4cf004", collections: ["women", "biker"], bestSellerRank: 8, createdAt: "2026-04-04" },
  { id: "p21", handle: "ellis-flat-lay-biker", name: "Ellis biker", colour: "Jet black", price: 499, image: "1727515546577-f7d82a47b51d", collections: ["men", "biker"], createdAt: "2026-11-02" },
  { id: "p22", handle: "wren-biker", name: "Wren biker", colour: "Jet black", price: 489, image: "1727515192207-3dc860bfd773", collections: ["women", "biker"], createdAt: "2026-11-09" },
];

// Built once at module load: O(1) lookups for the cart instead of O(n) .find() per line item
export const productById = new Map(products.map((p) => [p.id, p]));

export function productsInCollection(handle: CollectionHandle): Product[] {
  if (handle === "best-sellers") {
    return products
      .filter((p) => p.bestSellerRank !== undefined)
      .sort((a, b) => a.bestSellerRank! - b.bestSellerRank!);
  }
  return products.filter((p) => p.collections.includes(handle));
}

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const formatPrice = (n: number) => money.format(n);
