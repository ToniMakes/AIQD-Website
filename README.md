# AIQD Website

Public product and download page for [AI Agent Quota Dashboard](https://github.com/ToniMakes/ai-agent-quota-dashboard).

Live site: <https://aiqd.tonimakes.com>

The site explains what the current Windows preview does, links to the software release, and shows sanitized product screenshots. It is a dependency-free HTML, CSS, and JavaScript page. The page does not receive quota data from the desktop app.

## Public content

Keep this repository limited to product copy, sanitized demo screenshots, and public release information. Do not add account data, local paths, raw logs, prompts, source code, credentials, cookies, tokens, or private deployment details.

The optional website feedback form sends a visitor's message and email address to the feedback service only when they submit it. Do not describe this website behavior as part of the desktop app's local data flow.

## Build locally

```bash
npm run build
```

The build emits the Cloudflare Worker bundle in `dist/server/index.js`. Deployment metadata is in `.openai/hosting.json`.

## Keep release information current

When the software release changes, review the version, installer SHA256, and signature status shown in `index.html` against the software repository's latest release. Update the page copy and sanitized screenshots when necessary, then run the local build. Keep download buttons pointed at the GitHub `releases/latest` URL.
