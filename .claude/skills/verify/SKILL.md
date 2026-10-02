---
name: verify
description: Run the Happenence Nuxt site locally and check pages over HTTP (SSR HTML, llms.txt, raw .md, Decap config).
---

# Verify Happenence

## Launch
- `pnpm exec nuxt dev --port 3917` in the background. Ready in about 15s; poll `curl http://localhost:3917/robots.txt` until it returns 200.
- Gotcha: inside the Claude Code command sandbox, every server route returns 500 with `"worker exited with code 0"` (the Nitro worker dies). Start the dev server outside the sandbox. This is not an app bug.
- Always stop it afterwards: `Get-NetTCPConnection -LocalPort 3917 -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }`.

## Drive (no browser: the user doesn't allow launching Chrome unless asked)
- Navbar per page: `curl -s localhost:3917/<path> | grep -oE '<header class="site-navbar.{0,700}' | grep -oE '<a [^>]*>[^<]*</a>'`
- Pages: `/`, `/about`, `/contents`, `/legal`. Writing cards are `<ClientOnly>`; SSR shows the fallback list on `/contents`.
- AEO: `/llms.txt` (should have a Writings section), `/raw/<page>.md`.
- Decap: `/admin/index.html`. Parse `public/admin/config.yml` with js-yaml from `node_modules/.pnpm/js-yaml@*`.
- Client-only WebGL (About aurora) can't be observed without a browser. Fetch `/_nuxt/components/about/AuroraBackground.vue` to confirm it compiles, and say that the visuals weren't checked.
