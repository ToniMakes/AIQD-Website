const optOutKey = "aiqd-site:analytics-disabled";
const knownSources = new Set(["github", "reddit", "hackernews", "twitter", "linkedin", "google", "bing", "bilibili", "xiaohongshu"]);
const sourceHosts = [
  ["github.com", "github"], ["reddit.com", "reddit"], ["news.ycombinator.com", "hackernews"],
  ["twitter.com", "twitter"], ["x.com", "twitter"], ["t.co", "twitter"], ["linkedin.com", "linkedin"],
  ["google.com", "google"], ["google.com.au", "google"], ["bing.com", "bing"],
  ["bilibili.com", "bilibili"], ["xiaohongshu.com", "xiaohongshu"]
];
function analyticsDisabled() {
  if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true) return true;
  try { return localStorage.getItem(optOutKey) === "1"; } catch { return true; }
}
function sourceCategory() {
  const campaign = new URLSearchParams(location.search).get("utm_source")?.toLowerCase();
  if (campaign) return knownSources.has(campaign) ? campaign : "other";
  try {
    if (!document.referrer) return "direct";
    const referrer = new URL(document.referrer);
    if (referrer.origin === location.origin) return "direct";
    return sourceHosts.find(([host]) => referrer.hostname === host || referrer.hostname.endsWith(`.${host}`))?.[1] ?? "other";
  } catch { return "other"; }
}
const source = sourceCategory();
const sentClicks = new Set();
function track(event, placement) {
  if (analyticsDisabled()) return;
  void fetch("/api/events", {
    method: "POST", credentials: "same-origin", keepalive: true,
    headers: { "Content-Type": "application/json", "X-AIQD-Event": "1" },
    body: JSON.stringify({ event, placement, source, language: document.documentElement.lang.startsWith("zh") ? "zh" : "en" })
  }).catch(() => {});
}
// Prerendered tabs should count only after they become visible.
let viewed = false;
function pageView() {
  if (viewed || document.visibilityState !== "visible") return;
  viewed = true;
  track("page_view", "page");
}
document.addEventListener("visibilitychange", pageView);
pageView();
document.addEventListener("click", (event) => {
  const link = event.target.closest?.("a[data-analytics-event]");
  if (!link) return;
  const key = `${link.dataset.analyticsEvent}:${link.dataset.analyticsPlacement}`;
  if (sentClicks.has(key)) return;
  sentClicks.add(key);
  track(link.dataset.analyticsEvent, link.dataset.analyticsPlacement);
});
const toggle = document.querySelector("#analytics-toggle");
function updateToggle() {
  if (!toggle) return;
  const zh = document.documentElement.lang.startsWith("zh");
  toggle.textContent = analyticsDisabled()
    ? (zh ? "网站统计：已关闭" : "Website analytics: off")
    : (zh ? "网站统计：已开启（点击关闭）" : "Website analytics: on (click to disable)");
  toggle.setAttribute("aria-pressed", String(!analyticsDisabled()));
}
toggle?.addEventListener("click", () => {
  try { localStorage.setItem(optOutKey, analyticsDisabled() ? "0" : "1"); } catch { /* Storage restrictions leave tracking disabled. */ }
  updateToggle();
});
new MutationObserver(updateToggle).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
updateToggle();
