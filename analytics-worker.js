const analyticsEvents = new Set(["page_view", "download_click", "source_click", "feedback_click"]);
const analyticsSources = new Set(["direct", "github", "reddit", "hackernews", "twitter", "linkedin", "google", "bing", "bilibili", "xiaohongshu", "other"]);
const analyticsPlacements = new Set(["page", "top", "bottom", "navigation", "hero"]);
function analyticsJson(value, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
function isAnalyticsOwner(request, env) {
  const email = request.headers.get("oai-authenticated-user-email");
  return Boolean(env.ANALYTICS_OWNER_EMAIL && email && email.toLowerCase() === env.ANALYTICS_OWNER_EMAIL.toLowerCase());
}
async function handleAnalytics(request, env = {}) {
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(/\/$/, "") || "/";
  if (["/analytics", "/analytics/", "/analytics.html", "/api/analytics"].includes(url.pathname)) {
    if (!isAnalyticsOwner(request, env)) {
      if (url.pathname !== "/api/analytics" && !request.headers.get("oai-authenticated-user-email")) {
        return new Response(null, { status: 302, headers: { Location: "/signin-with-chatgpt?return_to=%2Fanalytics", "Cache-Control": "no-store" } });
      }
      return analyticsJson({ error: "Only the site owner can view analytics." }, 403);
    }
    if (request.method !== "GET") return analyticsJson({ error: "Method not allowed" }, 405);
    if (url.pathname === "/api/analytics") {
      if (!env.DB) return analyticsJson({ error: "Analytics storage is unavailable." }, 503);
      const days = [7, 30, 90].includes(Number(url.searchParams.get("days"))) ? Number(url.searchParams.get("days")) : 30;
      const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
      try {
        const { results } = await env.DB.prepare("SELECT day, event, source, placement, language, count FROM analytics_daily WHERE day >= ? ORDER BY day DESC").bind(since).all();
        return analyticsJson({ days, since, timezone: "UTC", rows: results });
      } catch { return analyticsJson({ error: "Analytics could not be loaded. Try again later." }, 503); }
    }
    return null;
  }
  if (url.pathname !== "/api/events") return null;
  if (request.method !== "POST") return analyticsJson({ error: "Method not allowed" }, 405);
  // Public, aggregate-only ingestion. Reject cross-site browsers and unexpected payloads.
  if (request.headers.get("origin") !== url.origin || request.headers.get("x-aiqd-event") !== "1" ||
      !request.headers.get("content-type")?.startsWith("application/json")) return analyticsJson({ error: "Invalid request" }, 403);
  if (isAnalyticsOwner(request, env) || request.headers.get("sec-gpc") === "1" || request.headers.get("dnt") === "1" || /bot|crawler|spider|headless/i.test(request.headers.get("user-agent") ?? "")) {
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }
  if (!env.DB) return analyticsJson({ error: "Analytics storage is unavailable." }, 503);
  if (Number(request.headers.get("content-length")) > 512) return analyticsJson({ error: "Payload too large" }, 413);
  // Bound streaming input even when Content-Length is absent or incorrect.
  let bytes = 0;
  const reader = request.body?.getReader();
  if (!reader) return analyticsJson({ error: "Invalid event" }, 400);
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 512) { await reader.cancel(); return analyticsJson({ error: "Payload too large" }, 413); }
    chunks.push(value);
  }
  let event;
  try { event = JSON.parse(await new Blob(chunks).text()); } catch { return analyticsJson({ error: "Invalid event" }, 400); }
  if (!event || typeof event !== "object" || Array.isArray(event) || Object.keys(event).sort().join(",") !== "event,language,placement,source" ||
      !analyticsEvents.has(event.event) || !analyticsSources.has(event.source) || !analyticsPlacements.has(event.placement) || !["en", "zh"].includes(event.language)) {
    return analyticsJson({ error: "Invalid event" }, 400);
  }
  const validPlacements = { page_view: ["page"], download_click: ["top", "bottom"], source_click: ["navigation", "hero"], feedback_click: ["navigation"] };
  if (!validPlacements[event.event].includes(event.placement)) return analyticsJson({ error: "Invalid placement" }, 400);
  const day = new Date().toISOString().slice(0, 10);
  try {
    await env.DB.prepare("INSERT INTO analytics_daily (day, event, source, placement, language, count) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(day, event, source, placement, language) DO UPDATE SET count = count + 1")
      .bind(day, event.event, event.source, event.placement, event.language).run();
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch { return analyticsJson({ error: "Analytics unavailable" }, 503); }
}
