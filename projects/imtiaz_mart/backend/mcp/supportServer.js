// MCP SERVER for customer support.
//
// What it is: a small program that offers "tools" (functions an LLM may ask to run) and
// "resources" (read-only data) over the Model Context Protocol. It knows nothing about
// OpenAI or the chat UI. Any MCP client can connect to it.
//
// How it is started: the API process (the MCP host) spawns this file as a child process and
// talks to it over stdio: JSON-RPC messages go in on stdin and come out on stdout.
// Nothing listens on a network port, so only the process that started it can call it.
//
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { connectMongo, disconnectMongo } from "../src/db/mongo.js";
import { connectRedis, disconnectRedis } from "../src/db/redis.js";
import { getOrderForUser, listOrdersForUser } from "../src/modules/orders/order.service.js";
import { CATEGORIES } from "../src/modules/products/categories.js";
import { Product } from "../src/modules/products/product.model.js";
import { search } from "../src/modules/search/search.service.js";
import { FAQ_URI, faqAsText } from "./faq.js";

// Rule for a stdio server: stdout is the protocol channel. One stray console.log (for example
// "MongoDB connected" in db/mongo.js) would be read by the client as a broken message.
// So every log in this process goes to stderr instead.
console.log = console.error;

const server = new McpServer({ name: "scale-cart-support", version: "0.1.0" });

// ---------- Shapes sent to the LLM ----------
// Send only what an answer needs. No street address, phone number or internal ids:
// data the LLM never receives can never leak into a reply.
const usd = (cents) => `$${(cents / 100).toFixed(2)}`;

const orderView = (o) => ({
  number: o.number,
  status: o.status, // placed | shipped | delivered | cancelled
  placedOn: new Date(o.createdAt).toISOString().slice(0, 10),
  items: o.items.map((i) => ({ name: i.name, colour: i.colour, size: i.size, qty: i.qty, unitPrice: usd(i.unitPriceCents) })),
  subtotal: usd(o.subtotalCents),
  shipping: usd(o.shippingCents),
  total: usd(o.totalCents),
  shippingMethod: o.shipping.method, // standard | express
  shipTo: `${o.shipping.city}, ${o.shipping.country}`,
  payment: `${o.payment.method === "cod" ? "cash on delivery" : o.payment.method} (${o.payment.status})`,
});

const availability = (stock) => {
  if (stock === undefined || stock === null) return "unknown";
  if (stock <= 0) return "sold out";
  return stock <= 5 ? `only ${stock} left` : "in stock";
};

// ---------- Tool results ----------
// An MCP tool result is a list of content blocks. isError tells the LLM the call failed,
// so it can apologise or try something else instead of inventing an answer.
const ok = (data) => ({ content: [{ type: "text", text: JSON.stringify(data) }] });
const fail = (message) => ({ content: [{ type: "text", text: message }], isError: true });

/** Run a tool body. Unexpected errors are logged here and never shown to the LLM in detail. */
const safely = (name, run) => async (args) => {
  try {
    return await run(args);
  } catch (err) {
    console.error(`[mcp] ${name} failed:`, err?.message);
    return fail("The lookup failed because of a temporary problem. Ask the customer to try again in a moment.");
  }
};

// ---------- Input schemas ----------
// The SDK turns these Zod schemas into JSON Schema (sent to the client in tools/list)
// and validates every call against them before our code runs.

// WHO is asking. The LLM never fills this in: the host removes it from the schema the LLM
// sees and sets it from the customer's login token. See src/modules/chat/chat.service.js.
const userId = z.string().regex(/^[a-f\d]{24}$/i).describe("Set by the host from the signed-in session.");

const READ_ONLY = { readOnlyHint: true }; // a hint for clients: this tool changes nothing

server.registerTool(
  "list_my_orders",
  {
    title: "List my orders",
    description: "The signed-in customer's most recent orders, newest first. Use it when they ask about their orders without giving an order number.",
    inputSchema: {
      userId,
      limit: z.number().int().min(1).max(10).default(5).describe("How many orders to return."),
    },
    annotations: READ_ONLY,
  },
  safely("list_my_orders", async ({ userId, limit }) => {
    const orders = await listOrdersForUser(userId, limit);
    return ok({ count: orders.length, orders: orders.map(orderView) });
  }),
);

server.registerTool(
  "get_order",
  {
    title: "Get one order",
    description: "Status, items and totals of ONE of the signed-in customer's orders, by order number.",
    inputSchema: {
      userId,
      orderNumber: z.string().trim().toUpperCase().regex(/^SC-[0-9A-F]{8}$/, "Order numbers look like SC-32833A06").describe("For example SC-32833A06."),
    },
    annotations: READ_ONLY,
  },
  safely("get_order", async ({ userId, orderNumber }) => {
    const order = await getOrderForUser(userId, orderNumber);
    // Same answer for "does not exist" and "belongs to someone else": never confirm other people's orders
    if (!order) return fail(`No order ${orderNumber} was found on this customer's account.`);
    return ok(orderView(order));
  }),
);

server.registerTool(
  "search_products",
  {
    title: "Search products",
    description:
      "Search the store catalog by words such as 'black biker jacket' or 'white sneakers'. Returns up to 5 matches with price, sizes and current stock (availability). When the customer gives a budget, pass it as maxPrice: the search then only returns products at or below that price.",
    inputSchema: {
      query: z.string().trim().min(2).max(80).describe("What the customer is looking for. Product words only: put the budget in maxPrice, not here."),
      category: z.enum(CATEGORIES).optional().describe("Only search inside this category."),
      maxPrice: z.number().positive().max(100_000).optional().describe("Highest price in US dollars, for example 800 for 'under $800'."),
    },
    annotations: READ_ONLY,
  },
  safely("search_products", async ({ query, category, maxPrice }) => {
    // 1. WHICH products: the store's own search (Atlas Search + Redis cache).
    //    The price limit is applied by the search index, so "top 5" means top 5 within budget.
    const maxPriceCents = maxPrice === undefined ? undefined : Math.round(maxPrice * 100);
    const { body } = await search({ q: query, category, maxPriceCents, limit: 5 });

    // 2. HOW MANY are left: read fresh from MongoDB. Search results are cached for minutes
    //    and stock changes with every order, so stock must not come from that cache.
    //    ONE query for all the products ($in on _id), not one query per product (no N+1).
    const stocks = await Product.find({ _id: { $in: body.items.map((p) => p.id) } }).select("stock").lean();
    const stockById = new Map(stocks.map((s) => [String(s._id), s.stock]));

    return ok({
      count: body.items.length,
      ...(maxPrice !== undefined && { maxPrice: usd(maxPriceCents) }),
      products: body.items.map((p) => ({
        handle: p.handle,
        name: p.name,
        category: p.category,
        colour: p.colour,
        price: usd(p.priceCents),
        sizes: p.sizes,
        availability: availability(stockById.get(p.id)),
      })),
    });
  }),
);

server.registerTool(
  "get_product",
  {
    title: "Get one product",
    description: "Price, sizes and stock of ONE product, by its handle (the 'handle' field returned by search_products).",
    inputSchema: {
      handle: z.string().trim().toLowerCase().min(1).max(120).describe("Product handle, copied exactly from a search_products result."),
    },
    annotations: READ_ONLY,
  },
  safely("get_product", async ({ handle }) => {
    // Indexed lookup (uniq_handle), and only the fields we return
    const p = await Product.findOne({ handle }).select("handle name category gender style colour priceCents compareAtCents sizes stock").lean();
    if (!p) return fail(`No product with the handle "${handle}". Use search_products to find the right handle.`);
    return ok({
      handle: p.handle,
      name: p.name,
      category: p.category,
      gender: p.gender,
      style: p.style,
      colour: p.colour,
      price: usd(p.priceCents),
      ...(p.compareAtCents && { wasPrice: usd(p.compareAtCents) }),
      sizes: p.sizes,
      availability: availability(p.stock),
    });
  }),
);

// ---------- Resource ----------
// A resource is data the HOST reads when it wants (here: once, to put the FAQ in the prompt).
// A tool is something the LLM decides to call. The FAQ is small and always relevant,
// so a resource fits better than a "search_faq" tool that costs an extra LLM round trip.
server.registerResource(
  "faq",
  FAQ_URI,
  { title: "Store FAQ", description: "Shipping, returns, sizing and product care policies.", mimeType: "text/plain" },
  async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/plain", text: faqAsText() }] }),
);

// ---------- Start and stop ----------
let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await Promise.allSettled([disconnectMongo(), disconnectRedis()]);
  process.exit(0);
}
// The host closing our stdin means "the connection is over" (also when the host crashes).
// Without this, the open database connection would keep this process alive as an orphan.
process.stdin.on("end", shutdown);
process.stdin.on("close", shutdown);
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

try {
  await Promise.all([connectMongo(), connectRedis()]); // Redis failing is not fatal (see db/redis.js)
  await server.connect(new StdioServerTransport()); // from here on we answer JSON-RPC on stdin/stdout
  console.error(`[mcp] support server ready (pid ${process.pid})`);
} catch (err) {
  console.error("[mcp] failed to start:", err?.message);
  process.exit(1);
}
