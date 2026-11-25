// See the MCP client and server talk to each other, with NO LLM involved.
//   npm run mcp:demo
// Read-only: it lists tools, reads the FAQ resource and runs lookups. It writes nothing.
import { closeSupportMcp, supportMcp } from "../src/modules/chat/mcpClient.js";

const mcp = await supportMcp(); // starts the server process + MCP handshake

console.log("\n1. Tools the server offers (tools/list):");
for (const t of mcp.tools) {
  console.log(`   ${t.name}(${Object.keys(t.inputSchema.properties ?? {}).join(", ")})`);
  console.log(`      ${t.description}`);
}

console.log("\n2. FAQ resource (resources/read), first 3 lines:");
console.log(mcp.faq.split("\n").slice(0, 3).map((l) => `   ${l}`).join("\n"));

// A made-up but well-formed user id: it owns no orders
const NOBODY = "000000000000000000000000";
const calls = [
  ["search_products", { query: "black jacket" }],
  ["search_products", { query: "black jacket", maxPrice: 410 }], // the price filter runs in the search index

  ["list_my_orders", { userId: NOBODY }],
  ["get_order", { userId: NOBODY, orderNumber: "SC-32833A06" }],
  ["get_order", { userId: "not-an-id", orderNumber: "SC-32833A06" }], // rejected by the input schema
];

console.log("\n3. Tool calls (tools/call):");
for (const [name, args] of calls) {
  const started = performance.now();
  try {
    const { text, isError } = await mcp.callTool(name, args);
    console.log(`   ${name}(${JSON.stringify(args)})  ${Math.round(performance.now() - started)} ms  ${isError ? "ERROR RESULT" : "ok"}`);
    console.log(`      ${text.slice(0, 300)}`);
  } catch (err) {
    console.log(`   ${name}(${JSON.stringify(args)})  PROTOCOL ERROR: ${err.message.slice(0, 200)}`);
  }
}

await closeSupportMcp(); // closes stdin: the server sees it and exits
console.log("\nDone. Server stopped.");
