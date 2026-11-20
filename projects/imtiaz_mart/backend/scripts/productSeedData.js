// Generates 100 dummy products per category from a small set of real Unsplash photos.
// Deterministic: a seeded random generator means every run produces the same catalog,
// so re-running the seed updates products in place instead of creating new ones.
import { SIZES_BY_CATEGORY } from "../src/modules/products/categories.js";

const PER_CATEGORY = 100;

// mulberry32: tiny, fast, seedable PRNG (Math.random can't be seeded)
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const slug = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const CATALOG = {
  "leather-jackets": {
    models: ["Ashford", "Hollis", "Marlow", "Cole", "Stratton", "Dalton", "Rowan", "Everett", "Kingsley", "Harlan", "Vera", "Celeste", "Margot", "Iris", "Sienna", "Noor", "Elodie", "Lena", "Ada", "Juno"],
    styles: [["biker", "Biker"], ["bomber", "Bomber"], ["cafe-racer", "Café racer"], ["field", "Field jacket"], ["trucker", "Trucker"]],
    colours: ["Black", "Walnut brown", "Cognac", "Tobacco", "Oxblood", "Chestnut", "Jet black"],
    price: [380, 560],
    genders: ["men", "women"],
    images: ["1551028719-00167b16eac5", "1578198576866-7e0ba6078128", "1675877879221-871aa9f7c314", "1623854156816-4c4fc355ffc7", "1591047139829-d91aecb6caea", "1774413768759-d3cc719c1a0e", "1605268845395-15828acd992e", "1521223890158-f9f7c3d5d504", "1602525582399-7ef5f604ff7e", "1615908280461-d7a332579330", "1602370463198-086436840055", "1511280303142-0051e93baeeb", "1777293875577-da93247013f2", "1760126070359-5b82710274fe", "1619731428826-a535570610b1", "1594803617043-2a5a0829fcd9", "1615397815341-bb06f6d55c94", "1600738454937-ca47a196172c", "1568631982221-1fb409cbde0e", "1719433227957-ef57ac4cf004", "1727515546577-f7d82a47b51d", "1727515192207-3dc860bfd773"],
  },
  shoes: {
    models: ["Arden", "Belmont", "Carlisle", "Dorset", "Easton", "Fenwick", "Glen", "Hadley", "Ingram", "Kendal", "Linden", "Mercer", "Norland", "Oakley", "Prescott", "Quinn", "Radley", "Sutton"],
    styles: [["sneaker", "Sneaker"], ["oxford", "Oxford"], ["loafer", "Loafer"], ["chelsea-boot", "Chelsea boot"], ["derby", "Derby"], ["high-top", "High-top"], ["work-boot", "Work boot"]],
    colours: ["White", "Black", "Brown", "Tan", "Burgundy", "Olive", "Navy"],
    price: [140, 340],
    genders: ["men", "women", "unisex"],
    images: ["1542291026-7eec264c27ff", "1606107557195-0e29a4b5b4aa", "1595950653106-6c9ebd614d3a", "1525966222134-fcfa99b8ae77", "1600269452121-4f2416e55c28", "1560769629-975ec94e6a86", "1608231387042-66d1773070a5", "1549298916-b41d501d3772", "1600185365483-26d7a4cc7519", "1543508282-6319a3e2621f", "1605733160314-4fc7dac4bb16", "1777987601431-8d27d2039cc4", "1668069226492-508742b03147", "1616406432452-07bc5938759d", "1638609348722-aa2a3a67db26", "1765779362274-5d8eedb9c6b8", "1614252235316-8c857d38b5f4", "1614253429340-98120bd6d753", "1760616172899-0681b97a2de3", "1608256246200-53e635b5b65f", "1760817074821-329c6a9e78d9", "1539185441755-769473a23570", "1551107696-a4b0c5a0d9a2", "1512374382149-233c42b6a83b"],
  },
  watches: {
    models: ["Meridian", "Regent", "Halden", "Sterling", "Corvan", "Altair", "Brixton", "Calloway", "Delmar", "Everly", "Fairhaven", "Granger", "Holloway", "Lyndon", "Montague", "Northgate"],
    styles: [["chronograph", "Chronograph"], ["diver", "Diver"], ["dress", "Dress watch"], ["field", "Field watch"], ["gmt", "GMT"], ["automatic", "Automatic"]],
    colours: ["Silver", "Gold", "Black", "Steel blue", "Rose gold", "Gunmetal"],
    price: [220, 980],
    genders: ["men", "women", "unisex"],
    images: ["1523170335258-f5ed11844a49", "1620625515032-6ed0c1790c75", "1772638904164-eed7c6b1e57e", "1524805444758-089113d48a6d", "1542496658-e33a6d0d50f6", "1622434641406-a158123450f9", "1767009951316-c3d2b63179ef", "1547996160-81dfa63595aa", "1773755060442-6d128b70dd20", "1522312346375-d1a52e2b99b3", "1639006570490-79c0c53f1080", "1524592094714-0f0654e20314", "1609587312208-cea54be969e7", "1600003014755-ba31aa59c4b6", "1618215650148-e8e61eae521c", "1670177257750-9b47927f68eb", "1670404160620-a3a86428560e", "1730757679771-b53e798846cf", "1600003014608-c2ccc1570a65", "1587925358603-c2eea5305bbc"],
  },
  sunglasses: {
    models: ["Riviera", "Capri", "Sorrento", "Malibu", "Monaco", "Palermo", "Tulum", "Santorini", "Amalfi", "Cannes", "Ibiza", "Lisbon", "Marbella", "Positano"],
    styles: [["aviator", "Aviator"], ["wayfarer", "Wayfarer"], ["round", "Round"], ["cat-eye", "Cat-eye"], ["square", "Square"], ["oversized", "Oversized"]],
    colours: ["Black", "Tortoiseshell", "Gold", "Silver", "Brown gradient", "Crystal", "Green G-15"],
    price: [95, 260],
    genders: ["men", "women", "unisex"],
    images: ["1511499767150-a48a237f0083", "1785672021160-29cccd65500d", "1572635196237-14b3f281503f", "1764783103855-2b747b9c8417", "1577803645773-f96470509666", "1584036553516-bf83210aa16c", "1508296695146-257a814070b4", "1610136649349-0f646f318053", "1653038282189-803202722a05", "1473496169904-658ba7c44d8a", "1608539733292-190446b22b83", "1611222777277-61319d63ca94", "1566421966482-ad8076104d8e", "1559070081-648fb00b2ed1", "1618677366787-9727aacca7ea", "1587310311582-aa7610e90826", "1708799366365-a24608103bed", "1589642380614-4a8c2147b857"],
  },
  clothing: {
    models: ["Atlas", "Bowen", "Crane", "Drummond", "Ellery", "Foster", "Garrick", "Hale", "Imogen", "Jessa", "Keira", "Lowell", "Maren", "Nolan", "Odette", "Pippa"],
    styles: [["t-shirt", "T-shirt"], ["oxford-shirt", "Oxford shirt"], ["flannel", "Flannel shirt"], ["overshirt", "Overshirt"], ["blazer", "Blazer"], ["knit", "Knit sweater"], ["chinos", "Chinos"]],
    colours: ["White", "Black", "Navy", "Olive", "Sand", "Grey marl", "Sky blue", "Rust"],
    price: [45, 240],
    genders: ["men", "women", "unisex"],
    images: ["1581655353564-df123a1eb820", "1778671394516-8270eac13c42", "1583743814966-8936f5b7be1a", "1618354691373-d851c5c3a990", "1521572163474-6864f9cf17ab", "1759572095329-1dcf9522762b", "1622445275463-afa2ab738c34", "1620799140408-edc6dcb6d633", "1651761179569-4ba2aa054997", "1562157873-818bc0726f68", "1782227286076-4f5153a8cdac", "1558769132-cb1aea458c5e", "1489987707025-afc232f7ea0f", "1618886614638-80e3c103d31a", "1776843370483-4f793bc14739", "1667284152861-36e03571486a", "1552252059-9d77e4059ad1", "1552168212-9ceb61083ba0", "1537261131936-3cdff36a1ac9", "1515886657613-9f3515b0c78f", "1554412933-514a83d2f3c8", "1590330297626-d7aff25a0431", "1618244972963-dbee1a7edc95", "1512101903502-7eb0c9022c74"],
  },
};

const START = Date.UTC(2025, 0, 1);
const SPAN_DAYS = 680;

export function buildSeedProducts() {
  const out = [];
  Object.entries(CATALOG).forEach(([category, c], ci) => {
    const rand = rng(1000 + ci);
    for (let i = 0; i < PER_CATEGORY; i++) {
      const model = c.models[i % c.models.length];
      const [styleKey, styleLabel] = c.styles[Math.floor(i / c.models.length + i) % c.styles.length];
      const colour = c.colours[Math.floor(rand() * c.colours.length)];
      const dollars = Math.round((c.price[0] + rand() * (c.price[1] - c.price[0])) / 5) * 5;
      const onSale = rand() < 0.15;
      const name = `${model} ${styleLabel.toLowerCase()}`.replace(/^./, (ch) => ch.toUpperCase());
      out.push({
        handle: `${category}-${slug(name)}-${slug(colour)}-${String(i + 1).padStart(3, "0")}`,
        name,
        category,
        gender: c.genders[Math.floor(rand() * c.genders.length)],
        style: styleKey,
        colour,
        priceCents: dollars * 100,
        ...(onSale && { compareAtCents: Math.round((dollars * (1.15 + rand() * 0.2)) / 5) * 5 * 100 }),
        image: c.images[i % c.images.length],
        sizes: SIZES_BY_CATEGORY[category],
        // Skewed like real sales: a few best sellers, a long tail. Ties are likely, which is
        // exactly why the cursor uses _id as a tie-breaker.
        salesCount: Math.floor(rand() ** 3 * 2000),
        createdAt: new Date(START + Math.floor(rand() * SPAN_DAYS) * 86_400_000),
      });
    }
  });
  return out;
}
