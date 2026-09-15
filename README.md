# AIQD Website

Public download and product page for [AI Agent Quota Dashboard](https://github.com/ToniMakes/ai-agent-quota-dashboard).

Live site: <https://aiqd.tonimakes.com>

Current public release: `v0.1.0`, an unsigned Windows x64 preview. Users should verify the SHA256 shown on the GitHub Release before running the installer.

The site is a small dependency-free HTML/CSS/JavaScript page. The download buttons point to the latest GitHub Release; the Windows installer and its SHA256 checksum are published in the software repository rather than copied into this website repository.

Public-content rule: keep this repository limited to product copy, sanitized demo screenshots, and public release links. Do not add account data, local paths, raw logs, prompts, source code, credentials, cookies, tokens, or private deployment details.

## Local build

```bash
npm run build
```

The build emits a Cloudflare Worker bundle in `dist/server/index.js`. Deployment metadata lives in `.openai/hosting.json`.

## Release updates

When the software release changes, update the visible version and published installer SHA256 in `index.html`, run the build, and publish the website through the existing Sites project. Keep the download buttons pointed at the GitHub `releases/latest` URL so future releases do not require changing the link.
