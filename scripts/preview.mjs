// Local-only preview adapter; never included in the deployed Worker.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "../dist/server/index.js";
const db = new DatabaseSync(":memory:");
db.exec(readFileSync(new URL("../drizzle/0000_analytics.sql", import.meta.url), "utf8"));
const env = {
  ANALYTICS_OWNER_EMAIL: "preview@example.test",
  DB: { prepare(sql) { return { bind(...values) { return {
    async run() { return db.prepare(sql).run(...values); },
    async all() { return { results: db.prepare(sql).all(...values) }; }
  }; } }; } }
};
const server = createServer(async (incoming, outgoing) => {
  try {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const headers = new Headers(incoming.headers);
    // Only this loopback preview simulates the hosting platform's owner identity.
    if (incoming.url.startsWith("/analytics") || incoming.url.startsWith("/api/analytics")) {
      headers.set("oai-authenticated-user-email", env.ANALYTICS_OWNER_EMAIL);
    }
    const request = new Request(`http://127.0.0.1:4173${incoming.url}`, {
      method: incoming.method, headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined
    });
    const response = await worker.fetch(request, env);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    outgoing.writeHead(500); outgoing.end("Preview error");
  }
});
server.listen(4173, "127.0.0.1", () => console.log("Local: http://127.0.0.1:4173"));
