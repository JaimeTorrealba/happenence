# Mistakes

- 2026-10-01: In the Decap CMS local-testing steps I didn't say that `decap-server` (port 8081) is a background API and not something to open in the browser, so the user opened it and got "Cannot GET". When giving setup steps for a first-timer, say which URL to open and which processes only need to keep running.
- 2026-10-01: I gave `http://localhost:3000/admin/` as the local CMS URL without checking that Nuxt's dev server maps `/admin/` to `public/admin/index.html`. Use `/admin/index.html` locally unless that mapping has been confirmed.

- 2026-10-02: Planned a custom `/raw/[...slug].md` server route before checking the installed `@nuxt/content` — v3.16 already ships it (plus llms.txt integration) when `nuxt-llms` is installed. Check node_modules for built-ins before planning custom code.
