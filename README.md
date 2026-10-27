# AIQD Website

Public product and download page for [AI Agent Quota Dashboard](https://github.com/ToniMakes/ai-agent-quota-dashboard).

Live site: <https://aiqd.tonimakes.com>

The site explains what the current Windows preview does, links to the software release, and shows sanitized product screenshots. It is a dependency-free HTML, CSS, and JavaScript page. The page does not receive quota data from the desktop app.

## Public content

This repository contains the website source, its aggregate analytics collector and owner dashboard, database migrations, tests, product copy, sanitized demo screenshots, and public release information. Do not add real account data, private local paths, raw logs, prompts, private user source code, credentials, cookies, tokens, database dumps, or private deployment details.

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

Use Node.js 24 or newer (the tests and local preview use its built-in SQLite).
There are no npm dependencies to install.

```bash
npm test
npm run build
node scripts/preview.mjs
```

The build emits the Cloudflare Worker bundle in `dist/server/index.js`. Deployment metadata is in `.openai/hosting.json`.

The preview serves `http://127.0.0.1:4173` with an in-memory database. Its
`/analytics` page simulates an owner identity only on the local preview server;
that adapter is never included in the deployed Worker. Preview data is discarded
when the process stops. Production identity headers must be supplied and protected
by the hosting platform; do not expose the Worker directly behind an untrusted
proxy that lets visitors supply those headers.

## Source layout and deployment

- `index.html`, `styles.css`, `app.js`: public product page and language switching.
- `analytics.js`: browser events and opt-out control.
- `analytics-worker.js`: event validation, aggregate storage, and owner authorization.
- `analytics.html`, `analytics-dashboard.js`: owner-only statistics interface.
- `drizzle/`: schema migrations, not production statistics.
- `tests/analytics.test.mjs`: SQL, authorization, and privacy behavior tests.

The public source code does not grant access to the deployed dashboard or data.
The owner's email is a runtime secret; actual counts remain in the hosted D1
database. The MIT license covers this repository's implementation, including
analytics. The external feedback widget and hosting platform are separate services
and are not distributed by this repository.

When deploying a fork with Sites, replace `.openai/hosting.json`'s `project_id`
with the ID of your own Site, keep the `DB` binding, and configure your own
`ANALYTICS_OWNER_EMAIL` runtime secret. Do not reuse the original Site identity.
Other Cloudflare hosting requires a D1 binding, the SQL migration, and a trusted
authentication layer; a build alone does not configure production authentication.

## Keep release information current

When the software release changes, review the version, installer SHA256, and signature status shown in `index.html` against the software repository's latest release. Update the page copy and sanitized screenshots when necessary, then run the local build. Keep download buttons pointed at the GitHub `releases/latest` URL.

## License

[MIT](LICENSE). The desktop application's source is maintained in its
[separate repository](https://github.com/ToniMakes/ai-agent-quota-dashboard).
