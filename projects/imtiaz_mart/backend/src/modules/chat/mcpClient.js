import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { FAQ_URI } from "../../../mcp/faq.js";

// MCP CLIENT: this process's connection to ONE MCP server (the support server).
// The rule in MCP is one client per server. Adding a second server later (GitHub, payments...)
// means a second file like this one, not a change to the server.
//
// Transport = stdio: we start the server as a child process and exchange JSON-RPC messages
// over its stdin/stdout. Each API process (4001, 4002, 4003) starts its own child.

const SERVER_FILE = fileURLToPath(new URL("../../../mcp/supportServer.js", import.meta.url));
const TOOL_TIMEOUT_MS = 8000;

// Least privilege: the tool server needs the database settings, not the LLM key.
// (By default the SDK passes almost no environment variables to the child, so we choose.)
function serverEnv() {
  const { OPENAI_API_KEY: _hidden, ...rest } = process.env;
  return Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
}

async function connect(onClose) {
  const transport = new StdioClientTransport({
    command: process.execPath, // the same node binary that runs the API
    args: [SERVER_FILE],
    env: serverEnv(),
    stderr: "inherit", // the server's logs show up in our logs
  });
  const client = new Client({ name: "scale-cart-api", version: "0.1.0" });
  client.onclose = onClose; // the server process died or was closed

  // connect() starts the child and does the MCP handshake ("initialize"): both sides
  // exchange their name, protocol version and capabilities (tools, resources...).
  await client.connect(transport);

  // Discovery: ask the server what it offers. Nothing about the tools is hard-coded here,
  // so a new tool on the server appears in the chatbot without touching the host.
  const [{ tools }, faq] = await Promise.all([client.listTools(), client.readResource({ uri: FAQ_URI })]);

  return {
    tools, // [{ name, description, inputSchema (JSON Schema) }]
    faq: faq.contents.map((c) => c.text ?? "").join("\n"),
    /** Run one tool on the server. Returns { text, isError }. */
    async callTool(name, args) {
      const result = await client.callTool({ name, arguments: args }, undefined, { timeout: TOOL_TIMEOUT_MS });
      const text = (result.content ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
      return { text, isError: Boolean(result.isError) };
    },
    close: () => client.close(),
  };
}

// Single-flight connect (same idea as lib/cache.js): the first request starts the server,
// requests arriving meanwhile wait for the SAME promise instead of starting 10 servers.
let session = null;

/** The connected MCP session, starting the server on first use. */
export function supportMcp() {
  if (!session) {
    // Forget this session when it ends or fails to start, so the next request reconnects.
    // The check keeps an old session's late "close" from wiping a newer one.
    const forget = () => {
      if (session === mine) session = null;
    };
    const mine = connect(forget);
    mine.catch(forget);
    session = mine;
  }
  return session;
}

/** Stop the server process (called on API shutdown). */
export async function closeSupportMcp() {
  const running = session;
  session = null;
  if (running) await running.then((s) => s.close()).catch(() => {});
}
