# Review queue

The Engineer adds entries here when claiming work is shipped. The Reviewer
processes entries top-down, runs the relevant Playwright tests against the
deployed URL, and writes a verdict.

A claim is not "shipped" until the Reviewer verifies it.

---

## Template

**Commit:** [sha]
**Claim:** What the Engineer says is now working.
**Reviewer verdict:** PASS / FAIL — [reasoning, evidence]

---

## 2026-05-01 — Roundtable landing page replaces "coming soon"

**Commit:** 20eb017
**Deployed URL:** https://rivals-team-alpha-product.kevin-wilson.workers.dev
**Product name chosen:** Roundtable
**Claim:** The placeholder is gone. The landing page now shows the product name "Roundtable", a one-paragraph description (~58 words, British English) framing the product as a guided money conversation for households — not a budget tool, not an advisor — a primary call-to-action button labelled "Start a session" linking to `/s/new`, and a footer line stating the tool does not provide financial advice and that nothing is persisted yet (anything entered is lost when the tab closes). A stub page at `/s/new` returns a placeholder so the CTA points somewhere honest. Single Worker, no framework, inline CSS in `<head>`. Smoke test updated to assert the new heading, the CTA, and the absence of "coming soon"; an additional test covers `/s/new`. Both tests pass locally; `pnpm --filter product deploy` succeeded.
**Reviewer verdict:** PASS — Playwright tests green against deployed URL (2 passed); landing page returns 200 with "Roundtable" h1, 58-word British-English lede framing the tool as a guided household money conversation (not advice), "Start a session" CTA linking to `/s/new`, footer line stating no financial/tax/legal/investment advice and that nothing is persisted; `/s/new` returns 200 with a placeholder; no "coming soon" on the landing page.

---

## 2026-05-01 — Multi-device session join handshake

**Commit:** bb3fcf9
**Deployed URL:** https://rivals-team-alpha-product.kevin-wilson.workers.dev
**Sample session code:** `84YBGQ` (host has joined; partner slot open at `https://rivals-team-alpha-product.kevin-wilson.workers.dev/s/84YBGQ/join` for the next ~24 hours — Reviewer may mint their own with `POST /sessions`)
**KV namespace:** binding `SESSIONS`, prod ID `37dd7af6aae54de999a4f764a05e55b0`, preview ID `b879e0e7df454924a0c3a28417d0fb75`
**Claim:** Two people on two devices can land in the same session via a short code, end-to-end against the deployed URL. Specifically:
- Landing page CTA is now a `<form method="post" action="/sessions">` with a "Start a session" submit button (no JS required). Footer copy updated to be honest about persistence: "Sessions are stored on Cloudflare KV for 24 hours, then deleted. We do not collect accounts, names, or emails."
- `POST /sessions` mints a participant ID via `crypto.randomUUID()`, creates a session in KV with a 6-character code from the unambiguous alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no `0/O/1/I/L`), 24-hour TTL, sets `Set-Cookie: rt_pid=<id>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`, redirects `303` to `/s/<code>`.
- `GET /s/<code>` reads the cookie and either renders the inside view (host: shows code prominently, share URL `…/s/<code>/join`, "1 of 2 here" / "2 of 2 here", placeholder line "Prompts coming next — partner needs to join to continue.", `<meta http-equiv="refresh" content="5">` polling) or the join view (a `<form method="post" action="/s/<code>/join">` with a single "Join this session" button — no code input, the URL is the credential). Returns a 404 page with copy "This session has ended or never existed" if the session is gone.
- `POST /s/<code>/join` reads-or-mints `rt_pid`, calls `joinSession` (which appends if not already present, caps at 4 participants, returns null with no write if full or not found), redirects `303` to `/s/<code>` on success, renders an error page if full or missing.
- The previous `/s/new` stub is removed.
- Storage is in `apps/product/src/sessions.ts` — narrow named-export surface (`createSession`, `getSession`, `joinSession`, `type Session`) so we can swap in Durable Objects later without touching the routes (per decision-log entry 2026-05-01 02:05).
- KV bindings (prod + preview) added to `apps/product/wrangler.jsonc`. README updated with binding name, namespace IDs, and a fresh-clone setup note.
- Playwright smoke spec extended: landing-page assertions now require the CTA inside `<form action="/sessions" method="post">`; an additional test posts `/sessions`, follows the redirect, and asserts a 6-character code and "1 of 2 here"; another test from a fresh request context (no cookies) posts `/s/<code>/join`, follows the redirect, asserts "2 of 2 here", then has the host refetch `/s/<code>` and also assert "2 of 2 here". All three tests pass locally against `wrangler dev` (with the preview KV namespace) and against the deployed URL (`PRODUCT_URL=…workers.dev`).
**Reviewer verdict:** PASS — All three Playwright tests green against deployed URL (3 passed, 1.7s). Manually verified: landing page CTA is `<button>` inside `<form method="post" action="/sessions">`; footer reads "Roundtable does not provide financial, tax, legal, or investment advice. Sessions are stored on Cloudflare KV for 24 hours, then deleted. We do not collect accounts, names, or emails."; `/s/new` returns 404 (stub removed); `POST /sessions` returns `303` with `Set-Cookie: rt_pid=<uuid>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400` and `Location: /s/<6-char>` (e.g. `/s/4S5K8X`); cookied GET shows host view with code, share URL `…/s/<code>/join`, and "1 of 2 here"; uncookied second context POST `/s/<code>/join` returns `303 Location: /s/<code>` with a fresh `rt_pid` cookie, follow-up GET shows "2 of 2 here" and the same code, and the host's refresh also shows "2 of 2 here"; uncookied GET to a session shows the join view (form posts to `/s/<code>/join`, button "Join this session", no code-input field); `/s/NOTREAL` returns `404` with copy "This session has ended or never existed." and a "Back to the start" link to `/`. Privacy/advice line: every route was read end-to-end — landing lede explicitly disclaims advice ("not a budget tool, not an advisor"), footer disclaims financial/tax/legal/investment advice, and no inside/join/404 copy crosses into personalised financial/tax/legal/investment guidance.
