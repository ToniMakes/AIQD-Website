import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { DatabaseSync } from "node:sqlite";

const workerSource = readFileSync(new URL("../analytics-worker.js", import.meta.url), "utf8");
function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../drizzle/0000_analytics.sql", import.meta.url), "utf8"));
  const context = vm.createContext({ Response, Request, URL, Blob, Date, Set });
  vm.runInContext(`${workerSource}\nglobalThis.handle = handleAnalytics;`, context);
  const env = {
    ANALYTICS_OWNER_EMAIL: "owner@example.com",
    DB: { prepare(sql) { return { bind(...values) { return {
      async run() { return db.prepare(sql).run(...values); },
      async all() { return { results: db.prepare(sql).all(...values) }; }
    }; } }; } }
  };
  function request(path = "/api/events", overrides = {}) {
    return new Request(`https://aiqd.test${path}`, {
      method: "POST",
      headers: { origin: "https://aiqd.test", "x-aiqd-event": "1", "content-type": "application/json" },
      body: JSON.stringify({ event: "download_click", source: "github", placement: "top", language: "en" }),
      ...overrides
    });
  }
  return { handle: context.handle, env, request, db };
}
test("stores only fixed aggregate dimensions, increments atomically, and reads real SQL", async () => {
  const { handle, env, request, db } = fixture();
  assert.equal((await handle(request(), env)).status, 204);
  assert.equal((await handle(request(), env)).status, 204);
  const rows = db.prepare("SELECT * FROM analytics_daily").all();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].count, 2);
  assert.deepEqual(Object.keys(rows[0]).sort(), ["count", "day", "event", "language", "placement", "source"]);
  const response = await handle(request("/api/analytics?days=7", { method: "GET", body: undefined, headers: { "oai-authenticated-user-email": "owner@example.com" } }), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).rows[0].count, 2);
  db.close();
});
test("protects dashboard, trailing-slash assets, and API for anonymous and non-owner accounts", async () => {
  const { handle, env, request, db } = fixture();
  for (const path of ["/analytics", "/analytics/", "/analytics.html", "/analytics.html/"]) {
    const anonymous = await handle(request(path, { method: "GET", body: undefined, headers: {} }), env);
    assert.equal(anonymous.status, 302);
    assert.equal(anonymous.headers.get("location"), "/signin-with-chatgpt?return_to=%2Fanalytics");
    const other = await handle(request(path, { method: "GET", body: undefined, headers: { "oai-authenticated-user-email": "other@example.com" } }), env);
    assert.equal(other.status, 403);
  }
  assert.equal((await handle(request("/api/analytics", { method: "GET", body: undefined, headers: {} }), env)).status, 403);
  assert.equal((await handle(request("/api/analytics", { method: "GET", body: undefined, headers: { "oai-authenticated-user-email": "owner@example.com" } }), { ...env, ANALYTICS_OWNER_EMAIL: undefined })).status, 403);
  db.close();
});
test("rejects cross-origin ingestion, extra private fields, invalid dimensions, and oversized bodies", async () => {
  const { handle, env, request, db } = fixture();
  assert.equal((await handle(request("/api/events", { headers: { origin: "https://evil.test", "content-type": "application/json", "x-aiqd-event": "1" } }), env)).status, 403);
  for (const payload of [null, [], { event: "download_click", source: "github", placement: "top", language: "en", email: "private@example.com" }, { event: "download_click", source: "unbounded-source", placement: "top", language: "en" }, { event: "page_view", source: "github", placement: "top", language: "en" }]) {
    assert.equal((await handle(request("/api/events", { body: JSON.stringify(payload) }), env)).status, 400);
  }
  assert.equal((await handle(request("/api/events", { body: "x".repeat(513) }), env)).status, 413);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM analytics_daily").get().n, 0);
  db.close();
});
test("excludes signed-in owner, privacy signals, and known bots", async () => {
  const { handle, env, request, db } = fixture();
  for (const extra of [{ "oai-authenticated-user-email": "OWNER@example.com" }, { dnt: "1" }, { "sec-gpc": "1" }, { "user-agent": "ExampleBot" }]) {
    const req = request();
    for (const [key, value] of Object.entries(extra)) req.headers.set(key, value);
    assert.equal((await handle(req, env)).status, 204);
  }
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM analytics_daily").get().n, 0);
  db.close();
});
test("storage failures produce bounded service errors without private details", async () => {
  const { handle, env, request, db } = fixture();
  const broken = { ...env, DB: { prepare() { throw new Error("private db credentials"); } } };
  const response = await handle(request(), broken);
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("private"), false);
  assert.equal((await handle(request(), {})).status, 503);
  db.close();
});

const clientSource = readFileSync(new URL("../analytics.js", import.meta.url), "utf8");
function browserFixture({ disabled = false, dnt, gpc, search = "", referrer = "" } = {}) {
  const calls = [];
  const listeners = {};
  const storage = new Map(disabled ? [["aiqd-site:analytics-disabled", "1"]] : []);
  const context = vm.createContext({
    URL, URLSearchParams, Set, navigator: { doNotTrack: dnt, globalPrivacyControl: gpc },
    location: { search, origin: "https://aiqd.test" },
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    document: { referrer, visibilityState: "visible", documentElement: { lang: "en" }, querySelector: () => null, addEventListener: (event, listener) => { listeners[event] = listener; } },
    MutationObserver: class { observe() {} },
    fetch: (url, options) => { calls.push({ url, options }); return Promise.resolve(); }
  });
  vm.runInContext(clientSource, context);
  return { calls, listeners };
}
test("client sends coarse sources without raw referrer/query and deduplicates link clicks", () => {
  const { calls, listeners } = browserFixture({ search: "?utm_source=github&email=private", referrer: "https://github.com/private/path?token=secret" });
  const link = { dataset: { analyticsEvent: "download_click", analyticsPlacement: "top" } };
  listeners.click({ target: { closest: () => link } });
  listeners.click({ target: { closest: () => link } });
  assert.equal(calls.length, 2);
  assert.equal(JSON.parse(calls[0].options.body).source, "github");
  assert.equal(JSON.stringify(calls).includes("private"), false);
  assert.equal(JSON.stringify(calls).includes("secret"), false);
  assert.equal(JSON.parse(browserFixture({ search: "?utm_source=private-campaign" }).calls[0].options.body).source, "other");
});
test("client honors opt-out, DNT, and GPC before sending page or click events", () => {
  for (const settings of [{ disabled: true }, { dnt: "1" }, { gpc: true }]) {
    const { calls, listeners } = browserFixture(settings);
    listeners.click({ target: { closest: () => ({ dataset: { analyticsEvent: "download_click", analyticsPlacement: "top" } }) } });
    assert.equal(calls.length, 0);
  }
});
