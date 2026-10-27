# AIQD Website

Public product and download page for [AI Agent Quota Dashboard](https://github.com/ToniMakes/ai-agent-quota-dashboard).

Live site: <https://aiqd.tonimakes.com>

The site explains what the current Windows preview does, links to the software release, and shows sanitized product screenshots. It is a dependency-free HTML, CSS, and JavaScript page. The page does not receive quota data from the desktop app.

## Public content

Keep this repository limited to product copy, sanitized demo screenshots, and public release information. Do not add account data, local paths, raw logs, prompts, source code, credentials, cookies, tokens, or private deployment details.

The optional website feedback form sends a visitor's message and email address to the feedback service only when they submit it. Do not describe this website behavior as part of the desktop app's local data flow.

## Website statistics

Open `/analytics` on the live website and sign in with the site owner's ChatGPT
account. The owner email is configured as the secret runtime variable
`ANALYTICS_OWNER_EMAIL` in Sites; it is never included in frontend assets.
Other signed-in accounts cannot access the dashboard or its data API.

The existing Sites hosting provisions the `DB` D1 binding and applies migrations
in `drizzle/`. Counts survive deployments. No external analytics account or
third-party tracking script is required. Run `npm test` and `npm run build` before
publishing. The build embeds browser assets and `analytics-worker.js` in the Worker.

Tracked events:

| Event | Meaning | Positions |
| --- | --- | --- |
| `page_view` | A page load became visible | page |
| `download_click` | Open GitHub Releases, not a completed download | top, bottom |
| `source_click` | Open the app source repository | navigation, hero |
| `feedback_click` | Open the feedback board, not a submitted message | navigation |

Each link position counts at most once per page load. Aggregate records contain
only UTC date, event, source category, position, UI language, and count. No unique
visitor counts, session IDs, cookies, raw IPs, raw user agents, raw query strings,
or full referrers are stored by this analytics implementation. Hosting services
still process network metadata. Browser Do Not Track, Global Privacy Control,
the footer opt-out, and signed-in owner traffic are excluded. Blocking analytics
does not interfere with navigation. These counts are approximate and cannot
measure retention or installation; public events can be fabricated by clients.

For promotion, use e.g. `https://aiqd.tonimakes.com/?utm_source=github`.
Accepted source labels: github, reddit, hackernews, twitter, linkedin, google,
bing, bilibili, xiaohongshu. Other nonempty values become `other`; URL parameters
are never stored verbatim. Without a campaign label, known referrer hosts are
categorized; no referrer becomes `direct`. Unknown referrers become `other`.

The dashboard shows 7/30/90-day summaries, daily counts, source counts, and top
versus bottom download clicks. Counts begin at deployment, with no historical
backfill. The click ratio is event clicks / page views, not unique-user conversion.

## Build locally

```bash
npm run build
```

The build emits the Cloudflare Worker bundle in `dist/server/index.js`. Deployment metadata is in `.openai/hosting.json`.

## Keep release information current

When the software release changes, review the version, installer SHA256, and signature status shown in `index.html` against the software repository's latest release. Update the page copy and sanitized screenshots when necessary, then run the local build. Keep download buttons pointed at the GitHub `releases/latest` URL.
