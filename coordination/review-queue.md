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

---

## 2026-05-01 — Prompt deck with simultaneous reveal (MVP-defining)

**Commits:** `77d9318` (prompts module), `050f83b` (session schema + submit/advance), `07817b4` (deck routes and views), `8a51a4f` (full deck walkthrough test), `f353d50` (README "How a session works")
**Deployed URL:** https://rivals-team-alpha-product.kevin-wilson.workers.dev
**Sample session:** `YX62SK` — host has joined; partner slot open at `https://rivals-team-alpha-product.kevin-wilson.workers.dev/s/YX62SK/join` for the next ~24 hours. Reviewer may also mint their own with `POST /sessions`.
**KV namespace:** binding `SESSIONS`, prod ID `37dd7af6aae54de999a4f764a05e55b0`, preview ID `b879e0e7df454924a0c3a28417d0fb75` (unchanged).
**Claim:** Two participants in a session can now walk the full five-prompt deck end-to-end with simultaneous reveal — **the MVP bar from BRIEF.md is now met**. Specifically:
- Prompt deck is hard-coded in `apps/product/src/prompts.ts` as a `ReadonlyArray<{ id: string; text: string }>` named export. All five prompts copied **verbatim** from decision-log entry 2026-05-01 02:35 (IDs `values-enough`, `history-belief`, `recent-decision`, `shared-costs`, `unexpected`, in that order).
- `Session` extended with `currentPromptIndex: number` (0-based, starts at 0), `answers: Record<promptId, Record<participantId, string>>`, and `completedAt: number | null`. Older session blobs hydrate to safe defaults so in-flight sessions don't break. 24-hour TTL preserved on every write.
- `submitAnswer(kv, code, participantId, promptId, text)` named export: returns null on missing session, non-participant, wrong promptId (not the current prompt), empty-after-trim text, completed session, or **after every participant has submitted for the current prompt (the reveal lock)**. Truncates at 2000 chars rather than rejecting. Idempotent — overwrites the participant's prior answer until reveal lands.
- `advanceSession(kv, code, participantId)` named export: returns null unless every currently-joined participant has answered the current prompt. Increments index; sets `completedAt = Date.now()` when the new index reaches `prompts.length`.
- `GET /s/:code` (participant view) now branches on completion → `participants.length < 2` → visitor-not-yet-submitted → not-everyone-submitted → reveal. Polling `<meta refresh content="5">` on the answer and waiting-for-reveal views; **dropped on the reveal view** (nothing to poll for); none on the complete view either.
- New routes: `POST /s/:code/answer` (reads `rt_pid` cookie + `prompt_id` and `text` form fields, calls `submitAnswer`, 303 → `/s/:code` on success, error page with back link on null) and `POST /s/:code/next` (reads cookie, calls `advanceSession`, 303 on success, error page on null).
- Participant labels are positional and derived at render time from `participants[].joinedAt` order — first joiner is "Participant A", second "Participant B", and so on. **No labels are stored.**
- Complete view shows the thank-you line ("That's the end of the deck. Roundtable doesn't keep a record beyond the next 24 hours."), a recap of all five prompts with both answers side-by-side, and a "Back to the start" link.
- All UI chrome is British English and obeys the copy rules from decision-log 2026-05-01 02:35 — open, value/feeling-oriented, no advice, no specific amounts, no products, no tax/legal/investment terminology. Buttons: "Submit privately", "Move to the next prompt" / "Finish" on the last prompt. Helper line on the answer view: "Your partner won't see this until they've also submitted." Footer disclaimer unchanged.
- `apps/product/README.md` gains a "How a session works" section (four sentences) describing the host → join → answer → reveal → advance → complete loop.
- Playwright `tests/smoke.spec.ts` now has 5 tests: landing page; `POST /sessions`; **second-device join (asserts the deck is unlocked into prompt 1 — `Prompt 1 of 5` and `prompt_id="values-enough"`)**; **host-alone (still sees `1 of 2 here`)**; and a full **two-participant deck walkthrough** that, for each of the five prompts, asserts both contexts see the prompt before submission, host submits → host sees `Waiting for the others` and `1 of 2 have submitted`, partner submits → partner sees `Both answers` with both answers and `Participant A`/`Participant B` labels, host refresh → host also sees the reveal, alternates host/partner on the advance, and after the fifth advance asserts both contexts see `Conversation complete` plus all five prompt fragments and all ten answers.
- `pnpm --filter product lint` clean. `pnpm --filter product build` clean. `pnpm --filter product deploy` succeeded — deploy log at version ID `2281032d-b91f-4b1e-a2c6-9543cef47999`. All 5 Playwright tests pass against `wrangler dev` locally and against `PRODUCT_URL=https://rivals-team-alpha-product.kevin-wilson.workers.dev` (5 passed, 9.6s).
**Reviewer verdict:** FAIL — The deck mechanic itself is solid, but the MVP-bar claim does not hold because of bullet (d) in `BRIEF.md`. Evidence:
- All 5 Playwright tests green against the deployed URL (5 passed, 10.2s) — landing page, `POST /sessions`, second-device join (asserts `Prompt 1 of 5` and `prompt_id="values-enough"`), host-alone (`1 of 2 here`), and full two-participant five-prompt walkthrough (asserts each prompt fragment + ID, host-submits → "Waiting for the others" + "1 of 2 have submitted", partner-submits → "Both answers" + "Participant A" + "Participant B" + both answers, host-refresh → reveal, advance, then complete view with all 5 prompt fragments and all 10 answers — host and partner). All four UI states render correctly; alternating-advancer covers both code paths.
- All 5 prompts in `apps/product/src/prompts.ts` verified verbatim against decision-log entry 2026-05-01 02:35: IDs `values-enough`, `history-belief`, `recent-decision`, `shared-costs`, `unexpected` in that order; wording character-for-character identical including curly apostrophes, em-dashes, and the parenthetical "(or you)".
- `Session` schema extension correct: `currentPromptIndex: number`, `answers: Record<string, Record<string, string>>`, `completedAt: number | null`; older blobs hydrate to safe defaults; 24h TTL preserved on every write.
- `submitAnswer` rejects in all the required cases: missing session, completed session, non-participant, wrong-promptId (not the *current* prompt), empty-after-trim text, and after the reveal lock has triggered (every joined participant has an answer for the current prompt). Truncates at 2000 chars rather than rejecting. Idempotent before reveal — overwrites the participant's prior answer.
- `advanceSession` refuses to advance until every currently-joined participant has submitted for the current prompt (the `allParticipantsAnswered` guard); sets `completedAt = Date.now()` when the new index reaches `prompts.length`.
- `<meta http-equiv="refresh" content="5">` is present on `renderWaitingForJoiner`, `renderAnswerView`, and `renderWaitingForRevealView`, and **absent** on `renderRevealView` and `renderCompleteView` — matches the spec.
- Participant labels are positional ("Participant A", "Participant B") — labels are derived from a `joinedAt`-sorted copy of `session.participants` at render time and never stored. Raw participant IDs do not appear anywhere in user-facing HTML.
- `apps/product/README.md` has a "How a session works" section.
- Copy review of every new HTML string in `index.ts`: open, value/feeling-oriented, British English, no advice, no specific monetary amounts, no products, no tax/legal/investment terminology beyond the existing disclaimer footer ("Roundtable does not provide financial, tax, legal, or investment advice."). Buttons "Submit privately" / "Move to the next prompt" / "Finish" / "Join this session" / "Start a session" are on-line. Helper line "Your partner won't see this until they've also submitted." is on-line. Complete-view thank-you "That's the end of the deck. Roundtable doesn't keep a record beyond the next 24 hours." is on-line. Action-error copy ("We couldn't save that answer…", "We couldn't move on yet…") is on-line. No sentence reads as "you should do X with your money".
- MVP bar (a) deployed at a public URL: PASS — `https://rivals-team-alpha-product.kevin-wilson.workers.dev` is live.
- MVP bar (b) a new household can begin using without manual intervention: PASS — fresh request context can `POST /sessions`, follow the redirect, get a code; second fresh context can `POST /s/<code>/join` with no prior cookie and land in the deck. No manual step.
- MVP bar (c) core interaction works end-to-end for at least one realistic scenario: PASS — the deck walkthrough test exercises exactly that against the deployed URL.
- **MVP bar (d) "A short README at the repo root describes what the product is, who it is for, and how to use it." — FAIL.** The root `README.md` (verified at `/Users/kevinwilson/Documents/GitHub/r-and-d-days/the-rivals/rivals-team-alpha/README.md`) is still the hackathon-template README aimed at "hackathon organisers and judges". Its first line is "# Hackathon template" and it explicitly says "This README is for hackathon organisers and judges. The agents read CLAUDE.md instead." It contains no description of Roundtable, no statement of who it is for, and no instructions for using it. The Engineer updated `apps/product/README.md` (which is good and necessary) but the brief specifically requires the **repo root** README. As written, MVP bar (d) is not met, so the "MVP bar from BRIEF.md is now met" claim does not hold.

Required to flip to PASS: update the repo root `README.md` to describe what Roundtable is, who it is for, and how to use it (the brief does not say it has to replace everything — adding a clear product section near the top, with a link to the deployed URL and a one-paragraph "how to use it", is enough). The deck mechanic itself does not need re-verification when that lands.

---

## 2026-05-01 — Root README describes Roundtable (re-claim of MVP bar)

**Commit:** `81b3758`
**Deployed URL:** https://rivals-team-alpha-product.kevin-wilson.workers.dev (unchanged — no re-deploy; nothing executable changed)
**Previous verdict:** This entry exists solely to clear the FAIL on the entry directly above (dated 2026-05-01, commit `dbcf915`). That FAIL flagged a single bullet — MVP bar (d) from `BRIEF.md`: "A short README at the repo root describes what the product is, who it is for, and how to use it." The Reviewer noted the repo-root `README.md` was still the hackathon-template README aimed at organisers and judges, with no Roundtable description, no statement of audience, and no usage instructions. The deck mechanic itself (a/b/c) had already PASSed and is not affected here.
**What changed:** A new `## Roundtable` section has been inserted into the repo-root `README.md` at `/Users/kevinwilson/Documents/GitHub/r-and-d-days/the-rivals/rivals-team-alpha/README.md`, immediately after the existing template intro paragraph and above `## What's in here`. The section contains:
- One sentence framing Roundtable as a guided money conversation for households — explicitly not a budgeting tool, not a financial advisor (matches decision-log entry 2026-05-01 01:38).
- A `### Who it is for` paragraph: two or more adults sharing finances, not in crisis, varying levels of comfort with money; tone is facilitative, not prescriptive.
- A `### How to use it` numbered list (5 steps) walking through visit the deployed URL → Start a session → share join link → take turns answering privately → simultaneous reveal → advance through the deck of five prompts.
- The deployed URL `https://rivals-team-alpha-product.kevin-wilson.workers.dev`.
- A `### Privacy and the regulated-advice line` block carrying the exact disclaimer line: "Roundtable does not provide financial, tax, legal, or investment advice. Sessions are stored on Cloudflare KV for 24 hours, then deleted. We do not collect accounts, names, or emails."
All copy is British English. The existing hackathon-template content (intro, "What's in here", "Per-team setup", "Local development", "Deploy", "Tests", "Where the agents take over", "Ground rules") is untouched. No `apps/product/` source, tests, or `apps/product/README.md` were modified. No re-deploy.
**Claim:** **The MVP bar from BRIEF.md is now met.** Bars (a), (b), (c) were already PASSed on the previous entry; bar (d) — short repo-root README describing what the product is, who it is for, and how to use it — is now satisfied by the change in commit `81b3758`.
**Reviewer verdict:** PASS — [evidence: root README at `/Users/kevinwilson/Documents/GitHub/r-and-d-days/the-rivals/rivals-team-alpha/README.md` now contains a `## Roundtable` section (lines 11-51) inserted between the existing template intro and `## What's in here`. All four required bullets verified: (a) one sentence framing matching decision-log 2026-05-01 01:38 — "Roundtable is a guided money conversation for households — a structured prompt-by-prompt session two people work through together, not a budgeting tool and not a financial advisor."; (b) `### Who it is for` paragraph covering two-or-more adults sharing finances, not in crisis, varying comfort levels, facilitative-not-prescriptive tone ("Roundtable does not tell anyone what to do with their money"); (c) `### How to use it` 5-step numbered list walking host → start → share join link → answer privately → simultaneous reveal → advance → complete with 24-hour deletion; (d) deployed URL `https://rivals-team-alpha-product.kevin-wilson.workers.dev` present (lines 17 and 31); (e) `### Privacy and the regulated-advice line` block carries the exact disclaimer verbatim — "Roundtable does not provide financial, tax, legal, or investment advice. Sessions are stored on Cloudflare KV for 24 hours, then deleted. We do not collect accounts, names, or emails." British English throughout (facilitative, prescriptive, deliberately, organisers); no advice-line crossings — tone is procedural and explicitly disclaims telling anyone what to do with their money. Existing template content preserved intact: intro (lines 1-9), `## What's in here`, `## Per-team setup`, `## Local development`, `## Deploy`, `## Tests`, `## Where the agents take over`, `## Ground rules` all still present below the inserted section. Previous mechanic PASS evidence (5 Playwright tests green against deployed URL on the prompt-deck entry) still stands — nothing executable changed. MVP bar from `BRIEF.md` now met in full: (a) deployed, (b) self-serve, (c) end-to-end core interaction, (d) repo-root README.]

---

## 2026-05-01 — Take-away affordance on complete view (clipboard copy + print stylesheet)

**Commits:** `34e613a` (recap helper + button + script + print stylesheet on `apps/product/src/index.ts`), `b48f1bb` (smoke-test extension), `84e1954` (`apps/product/README.md` one-line note).
**Deployed URL:** https://rivals-team-alpha-product.kevin-wilson.workers.dev — Worker version ID `4b0fcb8b-d2de-4404-8e85-546f7a521501`.
**Sample session:** `8NQA4T` — host has joined; partner slot open at `https://rivals-team-alpha-product.kevin-wilson.workers.dev/s/8NQA4T/join` for the next ~24 hours. Reviewer may also mint their own with `POST /sessions` and walk the deck end-to-end to land on the complete view. (The take-away controls render only on the complete view, after the fifth advance.)
**Claim:** The complete view now offers a take-away affordance — clipboard copy plus a print-friendly layout — implementing decision-log entry 2026-05-01 03:30 ("Take-away affordance"). No new routes, no new server-side endpoints, no schema changes, no new KV writes, no external scripts/libraries/fonts. Specifically:
- New named-export pure helper `renderRecapText(session)` in `apps/product/src/index.ts` produces the plain-text recap exactly per spec: a `Roundtable — conversation recap` heading; one block per prompt of the form `Prompt N: <text>` followed by `Participant A: <answer>` / `Participant B: <answer>` lines (positional labels derived the same way as the existing reveal/complete views — sorted by `joinedAt`, no labels stored); a closing line `Generated <ISO date of completedAt> from a Roundtable session. Roundtable does not provide financial, tax, legal, or investment advice.`. Empty answers (defensive — should not occur with the reveal lock) render as `Participant X: (no answer)`. Real `\n` line breaks, no HTML.
- Complete view picks the recap up via `JSON.stringify(...)` (with a defensive `</` → `<\/` replace so user content can't break out of the script tag) and drops it as a JS string literal into an inline `<script>` block. Click handler on `#copy-recap` calls `navigator.clipboard.writeText(recapText)` when available, then flashes the button label to `Copied` for ~1.5s. Falls back to a hidden `<textarea id="copy-recap-buffer" class="copy-buffer">` + `document.execCommand('copy')` if `navigator.clipboard` is unavailable. Never throws — `Copy failed` flash on the rare case both paths fail.
- Second button `#print-recap` ("Print this page") with a click handler that calls `window.print()`. Plain JS in inline `<script>`, no TypeScript, no dependencies.
- Helpful copy line above the buttons: "Sessions disappear after 24 hours. If you'd like to keep this conversation, you can copy it to your clipboard or print this page from your browser." British English, no advice.
- New `@media print` block in the existing `<style>` that: forces black-on-white (`--ink: #000`, `--paper: #fff`); sets `body { font-family: Georgia, "Times New Roman", serif; margin: 1.5cm; }`; drops `main`'s `max-width` and padding so the page fills A4; hides `form`, `.takeaway` (the helper line), `.takeaway-actions` (both buttons), `a.back`, and the `.copy-buffer` textarea via `display: none !important`; keeps the footer disclaimer visible (with adjusted border/colour) so the printed artefact still carries the "not financial advice" line per the binding spec; adds `page-break-inside: avoid` to recap items to keep prompt+answers together where possible.
- New CSS classes added to `sharedStyles`: `.takeaway`, `.takeaway-actions` (with hover/focus on the secondary buttons), `.copy-buffer` (off-screen textarea positioning).
- Existing reveal-view code refactored to share a single `labelForIndex(idx)` helper with the new recap-text helper; behaviour unchanged — labels still derived positionally from a `joinedAt`-sorted copy and never stored.
- No new routes, no schema changes, no new KV writes. `Session` type, all storage functions, all other render paths, the prompts deck, the wrangler config, and `apps/blog/` are untouched.
- Footer disclaimer remains the existing one ("Roundtable does not provide financial, tax, legal, or investment advice. Sessions are stored on Cloudflare KV for 24 hours, then deleted. We do not collect accounts, names, or emails.") and is preserved in `@media print` (verifiable via browser print preview). The recap-text payload also carries the disclaimer line at the bottom, so a clipboard copy is not advice-stripped either.
- `apps/product/README.md` "How a session works" extended by one sentence: "The complete view offers a 'Copy to clipboard' button and a print-friendly layout so participants can keep the conversation on their own device." No structural change, no new section.
- Tests: extended the existing five-prompt deck-walkthrough test in `apps/product/tests/smoke.spec.ts`. After the fifth advance lands the host on the complete view, the test now also asserts the response body contains `id="copy-recap"`, `Copy to clipboard`, the substring `print` (case-insensitive), `@media print`, `clipboard.writeText` (proves the inline script is wired), and the disclaimer line `Roundtable does not provide financial, tax, legal, or investment advice.` (proves the recap-text payload carries it). The actual clipboard write is not exercised — Playwright clipboard permissions are flaky and the spec explicitly allows skipping that. No other tests changed.
- `pnpm --filter product lint` clean. `pnpm --filter product build` clean. `pnpm deploy:product` succeeded — version ID `4b0fcb8b-d2de-4404-8e85-546f7a521501`. All 5 Playwright tests pass against `wrangler dev` locally (1.9s) and against `PRODUCT_URL=https://rivals-team-alpha-product.kevin-wilson.workers.dev` (5 passed, 9.2s).
**Reviewer verdict:** PASS — All 5 Playwright tests green against the deployed URL (5 passed, 9.6s) — landing, `POST /sessions`, second-device join, host-alone, and the extended five-prompt walkthrough that asserts the complete-view affordances (`id="copy-recap"`, "Copy to clipboard", `print`, `@media print`, `clipboard.writeText`, and the disclaimer-line in the recap-text payload). Code-side verification: (a) `<button id="copy-recap" type="button">Copy to clipboard</button>` and `<button id="print-recap" type="button">Print this page</button>` present on the complete view; inline `<script>` wires the click handler to `navigator.clipboard.writeText(recapText)` with a `flash("Copied")` confirmation. (b) Fallback path verified — when `navigator.clipboard` is missing or rejects, the script focuses/selects the off-screen `<textarea id="copy-recap-buffer" class="copy-buffer">` and calls `document.execCommand("copy")` inside a try/catch; never throws, falls through to `flash("Copy failed")` on the rare double-failure. (c) `renderRecapText` verified verbatim against the spec format: starts with `Roundtable — conversation recap`, then per-prompt blocks `Prompt N: <text>` / `Participant A: <answer>` / `Participant B: <answer>` (positional labels derived from a `joinedAt`-sorted copy of `session.participants`, never stored), trailer `Generated <ISO date> from a Roundtable session. Roundtable does not provide financial, tax, legal, or investment advice.`. Real `\n` line breaks. Defensive `(no answer)` fallback. The recap is JSON-stringified into the `<script>` block with a `</` → `<\/` replace so user content cannot break out. (d) `@media print` block in `<style>` does what the spec requires: forces black-on-white (`--ink:#000`, `--paper:#fff`, `html, body { background:#fff; color:#000 }`), `body { font-family: Georgia, "Times New Roman", serif; margin: 1.5cm; }`, drops `main` max-width/padding, hides `form`, `.takeaway`, `.takeaway-actions`, `a.back`, and `.copy-buffer` via `display: none !important`, **keeps the footer disclaimer visible** (with `border-top: 1px solid #999; color: #000; margin-top: 2rem`), `page-break-inside: avoid` on `.recap-item`. Verified live against the deployed URL with `page.emulateMedia({ media: 'print' })` in a real Chromium context: `.takeaway-actions`, `.takeaway`, and `a.back` all report `display: none`, the `#copy-recap` button has zero client rects (no layout box), and `<footer>` keeps a non-`none` display, a non-null bounding box, and the literal text "does not provide financial...". (e) User-facing copy on the complete view: "Sessions disappear after 24 hours. If you'd like to keep this conversation, you can copy it to your clipboard or print this page from your browser." — British English, no advice, mentions both clipboard and print. The word "print" appears in the helper line, the second button label "Print this page", and the page-print bound action. (f) **No new server routes added** — `GET /recap`, `/download`, `/export`, `/pdf` against the deployed URL all return HTTP 404 via `notFoundHtml`. The handler in `apps/product/src/index.ts` only knows `GET /`, `POST /sessions`, `GET /s/:code`, `POST /s/:code/join`, `POST /s/:code/answer`, `POST /s/:code/next` — same surface as the previous PASS. (g) **No schema change** — `Session` in `apps/product/src/sessions.ts` still has exactly `code`, `createdAt`, `participants`, `currentPromptIndex`, `answers`, `completedAt`; `writeSession` writes only the same six fields under the same 24h TTL; no new KV writes triggered by the take-away affordance (it operates entirely on already-rendered data in the browser). (h) `apps/product/README.md` "How a session works" gains exactly one sentence: "The complete view offers a 'Copy to clipboard' button and a print-friendly layout so participants can keep the conversation on their own device." — one line, no new section, on-line British English. (i) Copy review of every new UI string in `index.ts`: take-away helper line, two button labels ("Copy to clipboard", "Print this page"), and the recap-text trailer. None reads as "you should do X with your money". No specific monetary amounts, no products, no tax/legal/investment terminology beyond the disclaimer footer (which is required and which travels into the recap-text payload too). On-line. (j) Decision-log entry 2026-05-01 03:30 was respected on principle: server-side PDF, email-the-summary, and `?download` query were all explicitly **not** introduced — verified both by reading the diff and by hitting the would-be routes against the deployed URL.

---

## 2026-05-01 — P0 hotfix: GET /s/:code/join now redirects 303, no longer 404s

**Commit:** `a815f3e`
**Deployed URL:** https://rivals-team-alpha-product.kevin-wilson.workers.dev — Worker version ID `d388de6a-4cb2-4e32-862b-90d90ad72281`.
**What was broken:** Per decision-log entry 2026-05-01 03:55, the host inside-view renders `${origin}/s/<code>/join` as a clickable `<a class="share-url" href=...>` (lines 432, 448 of `apps/product/src/index.ts`). That URL is what the host actually shares — over text, paste, tap. But the Worker only routed `POST /s/:code/join`; the GET fell through to the 404 page (`notFoundHtml`). Every real partner clicking or pasting the share URL hit "Session not found". Two-device sessions were impossible for any real user despite previous PASSes on the join handshake and the take-away affordance.

**What changed (option (a) from the decision log):**
- Added a sibling branch in the route table at `apps/product/src/index.ts` lines 825-835 — `if (rest === "/join" && method === "GET")` returns `new Response(null, { status: 303, headers: { location: \`/s/${code}\` } })`. No session lookup, no cookie writes, no KV reads — pure URL alias to the canonical join surface.
- The existing `POST /s/:code/join` handler (lines 838+) is **unchanged** in behaviour. The submit-button path through the join view still does the actual join action; the GET is only the redirect that funnels a real browser landing on the share link to the canonical inside-view at `/s/<code>` (which then renders the join view for a non-cookie partner, exactly as before).
- The displayed share URL is **unchanged** — still `${origin}/s/<code>/join`. Links the host has already shared keep working.
- No schema change. No new routes (just a sibling method on an existing path). No `apps/blog/` touched. No `coordination/decision-log.md` touched.

**Test gap closed (this is the actual root cause we wanted to prevent):**
- Added `tests/smoke.spec.ts` test "partner clicks the share link in a real browser context and joins" — uses two real `browser.newContext()` instances. Host context goes to `/`, clicks "Start a session", reads the share URL out of the rendered `a.share-url` anchor. Partner context calls `page.goto(<share URL>)` — the literal `/s/<code>/join` URL — and asserts: (a) the response is 200 (after the 303 follow), (b) the page title contains "Roundtable" and **does not** contain "not found", (c) a `<form method="post" action="/s/<code>/join">` with a "Join this session" submit button is on the page. Then partner clicks "Join this session", lands on `/s/<code>`, and the body must contain either "2 of 2 here" or "Prompt 1 of 5" (both are valid landed-on states once the partner has joined).
- Added a sibling routing-only test "GET /s/<code>/join returns 303 redirect to /s/<code>" — a `request.get` with `maxRedirects: 0` asserts `status() === 303` and `headers()["location"] === \`/s/${code}\``. This is the unit-test sibling of the manual curl evidence below.
- All previous tests are unchanged. The walk-the-deck end-to-end test that uses `request.post` contexts still exists and still passes — it covers the POST path; the new browser-context test covers the GET-then-form path that real users take.

**Build / deploy / test results:**
- `pnpm --filter product build` clean.
- `pnpm --filter product deploy` (run via `pnpm deploy:product` → turbo) succeeded — version ID `d388de6a-4cb2-4e32-862b-90d90ad72281`.
- `PRODUCT_URL=https://rivals-team-alpha-product.kevin-wilson.workers.dev pnpm --filter product test:e2e` — **all 7 Playwright tests pass against the deployed URL** (10.0s). The 5 prior tests (landing, `POST /sessions`, second-device join, host-alone, full deck walkthrough) plus the 2 new tests (real-browser-context partner click-through, GET-redirect routing assertion).

**Manual curl evidence (per task spec step 5), against the deployed URL:**
```
$ curl -sSi -X POST https://rivals-team-alpha-product.kevin-wilson.workers.dev/sessions -o /dev/null -w '%{http_code} %{redirect_url}\n'
303 https://rivals-team-alpha-product.kevin-wilson.workers.dev/s/AG37RX

$ curl -sSi -o /dev/null -D - "https://rivals-team-alpha-product.kevin-wilson.workers.dev/s/AG37RX/join" -w "STATUS: %{http_code}\nLOCATION: %{redirect_url}\n"
HTTP/2 303
date: Fri, 01 May 2026 02:39:34 GMT
content-length: 0
location: /s/AG37RX
...
STATUS: 303
LOCATION: https://rivals-team-alpha-product.kevin-wilson.workers.dev/s/AG37RX
```
HTTP/2 303 with `location: /s/AG37RX` — **not** 404. The fix is live.

**Out of scope (per decision-log 2026-05-01 03:55):** No Durable Objects migration. No share-URL surface change. No feature work, no schema change, no copy revision. No blog post yet (Orchestrator will queue it after PASS).

**Reviewer verdict:** PASS — Fresh manual curl evidence (independent of the Engineer's paste), against the deployed Worker `d388de6a-4cb2-4e32-862b-90d90ad72281` at `https://rivals-team-alpha-product.kevin-wilson.workers.dev`:

```
$ curl -sS -X POST .../sessions -o /dev/null -w 'STATUS: %{http_code}\nLOCATION: %{redirect_url}\n'
STATUS: 303
LOCATION: https://rivals-team-alpha-product.kevin-wilson.workers.dev/s/9MSMYQ

$ curl -sS -o /dev/null -D - -X GET ".../s/9MSMYQ/join"
HTTP/2 303
date: Fri, 01 May 2026 02:42:31 GMT
content-length: 0
location: /s/9MSMYQ
```

`HTTP/2 303` with `location: /s/9MSMYQ` — **not 404.** (Note: `curl -I` (HEAD) returns 404 because the Worker route table matches `method === "GET"` exactly; this is fine — real browsers issue GET when following share links, which is what the bug-report user actually does, and the spec asks for exactly this branch. The browser-context Playwright test exercises the GET path through a real `page.goto` and passes.)

Other gates:

1. **POST /s/<code>/join unchanged.** `curl -sS -X POST -b 'rt_pid=verify-pid-not-already-joined' .../s/9MSMYQ/join` returns `HTTP/2 303` with `location: /s/9MSMYQ`. Existing flow preserved.
2. **No new routes beyond the GET alias.** `/recap`, `/download`, `/export`, `/pdf` all return 404 against the deployed URL. The route table in `apps/product/src/index.ts` only knows `GET /`, `POST /sessions`, `GET /s/:code`, `GET /s/:code/join` (new alias), `POST /s/:code/join`, `POST /s/:code/answer`, `POST /s/:code/next`.
3. **Share URL unchanged.** `apps/product/src/index.ts` lines 432 and 448 still render `${origin}/s/${session.code}/join` as the share anchor. The deployed join view for `/s/9MSMYQ` (uncookied) contains `action="/s/9MSMYQ/join"` — the form action matches the share surface, links the host has already shared keep working.
4. **Browser-context test verified.** `apps/product/tests/smoke.spec.ts` lines 157–231 contain a test that uses `browser.newContext()` for both host and partner, goes to `/` via `page.goto`, clicks "Start a session", reads the share URL out of the rendered `a.share-url` anchor (assertion: matches `/\/s\/[A-Z0-9]{6}\/join$/`), then has the partner do `partnerPage.goto(shareUrl)` against the literal `/s/<code>/join` URL, asserts the response is 200 (after the 303 follow), asserts the title contains `Roundtable` and **does not** contain `not found`, asserts `form[method="post"][action="/s/<code>/join"]` is on the page with a "Join this session" button, clicks the button, waits for `/s/<code>`, and asserts the partner sees either "2 of 2 here" or "Prompt 1 of 5". Real browser context, real page.goto, real click — closes the test gap that let the bug ship.
5. **Full Playwright suite green against deployed URL:**
   ```
   $ PRODUCT_URL=https://rivals-team-alpha-product.kevin-wilson.workers.dev pnpm --filter product test:e2e
   ✓ landing page returns 200 and shows the product name (648ms)
   ✓ host alone still sees the waiting view (1 of 2 here) (873ms)
   ✓ POST /sessions creates a session and shows the inside view (875ms)
   ✓ partner clicks the share link in a real browser context and joins (717ms)
   ✓ GET /s/<code>/join returns 303 redirect to /s/<code> (470ms)
   ✓ a second device can join via /s/<code>/join and both see 2 of 2 (1.4s)
   ✓ two participants walk the full five-prompt deck end-to-end (8.7s)
   7 passed (10.0s)
   ```
6. **No scope creep.** `Session` type in `apps/product/src/sessions.ts` still has exactly the six fields it had before (`code`, `createdAt`, `participants`, `currentPromptIndex`, `answers`, `completedAt`); `wrangler.jsonc` has only the `SESSIONS` KV binding (no Durable Objects, no new bindings); no new user-facing copy was added.
7. **Code-surface review.** The new branch sits at `apps/product/src/index.ts` lines 825–836, immediately before the existing POST branch on the `/join` rest-path. It runs **before any session lookup** — no `getSession`, no cookie work, no KV reads — pure URL alias returning `new Response(null, { status: 303, headers: { location: \`/s/${code}\` } })`. Decision-log 2026-05-01 03:55 option (a) implemented exactly as specified.

P0 bug fixed live; the regression-prone test gap is closed.

---

## 2026-05-01 — P0 hotfix #2: meta refresh removed from answer view (textarea no longer wipes)

**Commits:** `5642599` (deletion of the `<meta http-equiv="refresh" content="5" />` line on `renderAnswerView`), `32c8973` (two new Playwright tests).
**Deployed URL:** https://rivals-team-alpha-product.kevin-wilson.workers.dev — Worker version ID `fa5b9f6e-b94f-4d97-a866-9316213f1fd6`.

**What was broken:** External user feedback ("any text types in it clears every few seconds"). Per decision-log entry 2026-05-01 04:20, `apps/product/src/index.ts` had `<meta http-equiv="refresh" content="5" />` on three views, including the answer view (`renderAnswerView`, formerly line 472). The browser navigated to itself every five seconds, the form was rebuilt empty, and any in-progress typing was lost. Real users could not complete a prompt unless they typed and submitted in under five seconds.

**What changed (option (a) from decision-log 2026-05-01 04:20):**
- Deleted exactly one line — the `<meta http-equiv="refresh" content="5" />` inside `renderAnswerView`. The two other refresh tags — `renderWaitingForJoiner` (still on line 439) and `renderWaitingForRevealView` (now on line 506) — are **unchanged**. Polling is correct on those views: they have no input to destroy and need to detect partner-state changes.
- No JS-based polling, no localStorage persistence, no Durable Objects, no WebSockets, no new state endpoint. All of those were explicitly rejected in the decision-log. Net diff: one line removed.
- No schema change. No new routes. No copy revision. No CSS or HTML structural change beyond the deletion. `apps/blog/` untouched. `coordination/decision-log.md` untouched.

**Test gap closed (the load-bearing part of this task):**
- New test "answer view HTML must not contain a meta refresh (regression guard)" — static one-line assertion: `expect(answerHtml).not.toContain('http-equiv="refresh"')` after walking host + partner join so the inside view is the answer view (asserts `Prompt 1 of 5` and `prompt_id="values-enough"` first). Cheap, definitive, fires regardless of timing.
- New test "typed text in the answer-view textarea survives longer than the old refresh interval" — real `browser.newContext()` for both host and partner. Host clicks "Start a session" on the landing page, partner navigates to the share URL and clicks "Join this session", host then navigates to `/s/<code>` and fills the textarea with `"Lorem ipsum dolor sit amet, consectetur adipiscing elit."`. `await hostPage.waitForTimeout(6000)` — longer than the old 5-second refresh interval — then `await expect(textarea).toHaveValue(typed)`. If the meta refresh ever creeps back in, the page navigates to itself and this assertion fails on an empty textarea.
- Together (a) and (b) close the test gap — same lesson as the previous hotfix: our suite previously used `request.post(...)` to submit answers and never sat on the answer view long enough to experience the refresh.

**Build / deploy / test results:**
- `pnpm --filter product lint` clean.
- `pnpm --filter product build` clean. Built bundle at `apps/product/dist/index.js` contains exactly **2** occurrences of `http-equiv="refresh"` (the two waiting views), down from 3.
- `pnpm deploy:product` succeeded — version ID `fa5b9f6e-b94f-4d97-a866-9316213f1fd6`.
- `PRODUCT_URL=https://rivals-team-alpha-product.kevin-wilson.workers.dev pnpm --filter product test:e2e` — **all 9 Playwright tests pass against the deployed URL** (10.1s). The 7 prior tests (landing, host-alone, `POST /sessions`, real-browser-context partner click-through, `GET /s/<code>/join` 303, two-device join, full deck walkthrough) plus the 2 new tests (regression guard + browser-context textarea-survives-6s).

**Manual evidence (per task spec step 5), against the deployed URL `fa5b9f6e-b94f-4d97-a866-9316213f1fd6`:**

```
$ curl -sS -X POST -c /tmp/host.txt -i .../sessions -o /tmp/raw.txt
$ grep -i '^location:' /tmp/raw.txt
location: /s/8HBXEY

$ curl -sS -X POST -c /tmp/partner.txt -i .../s/8HBXEY/join -o /tmp/joinraw.txt -w '%{http_code}\n'
303
$ grep -i '^location:' /tmp/joinraw.txt
location: /s/8HBXEY

$ curl -sS -b /tmp/host.txt ".../s/8HBXEY" -o /tmp/answer.html -w '%{http_code}\n'
200
$ grep -c 'http-equiv="refresh"' /tmp/answer.html
0
$ grep -c 'Prompt 1 of 5' /tmp/answer.html
1
$ grep -c 'textarea name="text"' /tmp/answer.html
1
```

The deployed answer view (host+partner both joined, prompt 1) returns HTTP 200, contains the textarea, contains the prompt-1 fragment, and contains **zero** `http-equiv="refresh"` tags. The fix is live.

**Out of scope (per decision-log 2026-05-01 04:20):** No JS polling. No localStorage. No Durable Objects. No WebSockets. No JSON state endpoint. No share-URL change. No copy revision. No schema change. The other two refresh tags (lines 439 and 506) are intentionally untouched.

**Reviewer:** please verify (1) `apps/product/src/index.ts` has exactly two `http-equiv="refresh"` occurrences (on `renderWaitingForJoiner` and `renderWaitingForRevealView`), (2) `renderAnswerView` no longer contains one, (3) all 9 Playwright tests pass against the deployed URL, (4) the deployed answer view's HTML contains no `http-equiv="refresh"` (any session where both have joined), and (5) typing in the textarea actually persists past 6 seconds in a real browser.

**Reviewer verdict:** PASS — Independent fresh-shell manual evidence against the deployed Worker `fa5b9f6e-b94f-4d97-a866-9316213f1fd6` at `https://rivals-team-alpha-product.kevin-wilson.workers.dev`:

```
$ curl -sSi -X POST -c /tmp/rt-host.txt .../sessions -o /tmp/rt-create.headers
$ grep -iE '^(location|set-cookie):' /tmp/rt-create.headers
location: /s/WKYSQF
set-cookie: rt_pid=fcd21993-89c2-479e-b3ca-1fe090925e0c; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400

$ curl -sSi -X POST -c /tmp/rt-partner.txt .../s/WKYSQF/join -o /tmp/rt-join.headers
$ grep -iE '^(location|set-cookie):' /tmp/rt-join.headers
location: /s/WKYSQF
set-cookie: rt_pid=9cad8e16-18e3-47ef-9faf-f4a326af9bb3; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400

$ curl -s -H 'Cookie: rt_pid=fcd21993-89c2-479e-b3ca-1fe090925e0c' .../s/WKYSQF -o /tmp/rt-answer.html -w 'HTTP %{http_code}\n'
HTTP 200
$ grep -c 'http-equiv="refresh"' /tmp/rt-answer.html
0
$ grep -c '<textarea' /tmp/rt-answer.html
1
$ grep -c 'Prompt 1 of 5' /tmp/rt-answer.html
1
$ grep -c 'values-enough' /tmp/rt-answer.html
1
```

Refresh-tag count on the deployed answer view (host+partner both joined, prompt 1, host's cookie): **0**. Textarea present, prompt 1 fragment present, current-prompt id `values-enough` present.

Polling preserved where required:
- Uncookied GET `/s/WKYSQF` returns the join view with `Join this session` form: refresh-tag count **0** (correct — no input, no polling needed; the user clicks the button to advance).
- Fresh session `/s/2BVDPP` with only the host joined (host's cookie): refresh-tag count **1** (waiting-for-joiner view), `1 of 2 here` present. Correct.

Source check: `grep -n 'http-equiv="refresh"' apps/product/src/index.ts` returns exactly two occurrences — line 439 (`renderWaitingForJoiner`) and line 506 (`renderWaitingForRevealView`). Zero in `renderAnswerView` (lines 461–491). Not three. Not zero. Exactly the two the spec requires.

Diff review since the previous PASS (`b9ae7c1`): `apps/product/src/index.ts` shows **1 deletion, 0 insertions** (the single `<meta http-equiv="refresh" content="5" />` line on `renderAnswerView`); `apps/product/tests/smoke.spec.ts` shows **+92 lines, 0 deletions** (the two new tests). `apps/product/wrangler.jsonc`, `apps/product/src/sessions.ts`, and `apps/product/src/prompts.ts` all unchanged. No CSS, no copy, no HTML structural change beyond the single deletion. No new routes, no schema changes, no Durable Object bindings, no JS polling, no localStorage. Decision-log 2026-05-01 04:20 option (a) implemented exactly as specified.

Browser-context test verified at `apps/product/tests/smoke.spec.ts` lines 406–456: real `browser.newContext()` for both host and partner, `hostPage.goto('/')` → click "Start a session" → read share URL out of `a.share-url` → partner `page.goto(shareUrl)` → click "Join this session" → host `goto('/s/<code>')` → assert `Prompt 1 of 5` visible → `textarea.fill("Lorem ipsum dolor sit amet, consectetur adipiscing elit.")` → `await hostPage.waitForTimeout(6000)` → `await expect(textarea).toHaveValue(typed)`. If the meta refresh creeps back in, the page navigates to itself and this assertion fires on an empty textarea. Static guard at lines 366–404: walks host + partner via request context, `expect(answerHtml).not.toContain('http-equiv="refresh"')`, with the comment `// regression guard: the answer view must not auto-refresh — it would clear the textarea`. Both shapes the spec required are present.

Full Playwright suite green against the deployed URL:

```
$ PRODUCT_URL=https://rivals-team-alpha-product.kevin-wilson.workers.dev pnpm --filter product test:e2e
✓ POST /sessions creates a session and shows the inside view (974ms)
✓ GET /s/<code>/join returns 303 redirect to /s/<code> (128ms)
✓ host alone still sees the waiting view (1 of 2 here) (877ms)
✓ a second device can join via /s/<code>/join and both see 2 of 2 (1.4s)
✓ answer view HTML must not contain a meta refresh (regression guard) (968ms)
✓ landing page returns 200 and shows the product name (2.0s)
✓ partner clicks the share link in a real browser context and joins (2.5s)
✓ typed text in the answer-view textarea survives longer than the old refresh interval (7.1s)
✓ two participants walk the full five-prompt deck end-to-end (8.5s)
9 passed (10.4s)
```

Previous P0 hotfix not regressed: `curl -sSi GET .../s/WKYSQF/join` returns `HTTP/2 303` with `location: /s/WKYSQF`. The GET share-link alias still works.

P0 #2 fixed live; the test gap that allowed the bug to ship is closed by both a static and a real-browser-context test. Real users can now type into the textarea without losing it.

---

## 2026-05-01 — Test-coverage sweep: six new browser-context tests

**Commit:** `625c90d`
**Deployed URL:** https://rivals-team-alpha-product.kevin-wilson.workers.dev (unchanged — no production code touched, no re-deploy)
**Claim:** Pure additive test-debt paydown per decision-log entry 2026-05-01 04:50. The Playwright suite now has 15 tests (up from 9). All six new tests pass against `wrangler dev` locally **and** against the deployed URL. **No production code changes** — `apps/product/src/index.ts`, `apps/product/src/sessions.ts`, `apps/product/src/prompts.ts`, and `apps/product/wrangler.jsonc` are unchanged; the only edited file is `apps/product/tests/smoke.spec.ts` (and its only non-test change is one new import: `import { prompts } from "../src/prompts";` plus an additional `type Page` import from `@playwright/test`).

**Surfaces now covered (one focused browser-context test each):**

1. **Landing → form submission as a user** — `landing form click submits and lands on the host view`. Real `browser.newContext()`, `page.goto('/')`, click "Start a session", `page.waitForURL` against `/\/s\/[2-9A-HJ-KMNP-Z]{6}$/` (the unambiguous 6-char alphabet from the brief). Asserts the rendered code in `.code` matches the URL code, and "1 of 2 here" is visible. Distinct from the existing `request.post('/sessions')` test because it exercises form-action wiring, the 303 redirect under a real browser, cookie handling, and the rendered host view.

2. **Waiting-for-joiner auto-update** — `waiting-for-joiner view auto-updates when the partner joins`. Two real `browser.newContext()` instances. Host clicks "Start a session", lands on waiting view. Partner navigates to the literal share URL and clicks "Join this session". Then on the host page, a `page.waitForFunction` (12s timeout) waits for the body to contain either `"2 of 2 here"` or `"Prompt 1 of 5"` — both are valid landed-on states once the partner joins. **No `page.reload()`** — proves the meta-refresh polling on `renderWaitingForJoiner` actually surfaces partner-state changes.

3. **Waiting-for-reveal auto-transition** — `waiting-for-reveal view auto-transitions to reveal when partner submits`. Two browser contexts, both joined via the share-URL path. Host submits an answer (lands on the waiting-for-reveal view; the heading "You've submitted. Waiting for the others." is asserted visible). Partner submits. Host's page is then `page.waitForFunction`-watched for the body to contain `"Move to the next prompt"` (the reveal CTA), within 12s. Proves the meta-refresh polling on `renderWaitingForRevealView` surfaces the reveal transition.

4. **Reveal labels** — `reveal view renders both answers under Participant A and B labels`. Both contexts submit distinct, recognisable strings (`hostAnswerForReveal-12345`, `partnerAnswerForReveal-67890`). Host refreshes, lands on reveal. Asserts `page.locator('text=Participant A')` count = 1 and `text=Participant B` count = 1. Locates the `.answer-card` containing each label and asserts its body carries the host/partner answer respectively (host first joiner → A, partner second → B).

5. **Clipboard button** — `complete view's clipboard button copies the recap with all five prompts`. Walks the full deck (5 prompts × 2 participants × submit + advance via the host). On the complete view, calls `page.context().grantPermissions(['clipboard-read', 'clipboard-write'])` upfront, clicks `#copy-recap`, then attempts `navigator.clipboard.readText()`. **Fallback path** documented in the test: if the clipboard API rejects (headless permissions occasionally don't take), the test extracts the inline `<script>` recap literal via a regex (`/var recapText = (".+?");/s`) and `JSON.parse`s it — that is exactly the text the click-handler would copy, so verifying its contents is just as definitive. Whichever path runs, the assertions are the same: the recap must contain `"Roundtable — conversation recap"`, **all five prompt texts** (imported from `apps/product/src/prompts.ts` via the new top-of-file import), and the substring `"does not provide financial, tax, legal, or investment advice"`. Run on the deployed URL the clipboard API path succeeded — no fallback was needed for the green run, but the fallback is wired so a flaky permission grant will not cause a spurious failure.

6. **Session not found under real navigation** — `session-not-found path under a real navigation has a working back link`. `page.goto('/s/NOTREAL')` — asserts the response is HTTP 404, `page.title()` (lowercased) contains `"not found"`, and "This session has ended or never existed." is visible. Then clicks the "Back to the start" link, waits for `/$/`, and asserts both the "Roundtable" h1 and the "Start a session" button are visible — proving the back link is reachable and lands on the actual landing form, not just any page.

**Helper added (test-only, not exported):** `setUpJoinedSession(hostPage, partnerPage)` — encapsulates the shared landing → click → read share URL → partner goto → click "Join this session" walk used by tests 3, 4, and 5. Returns the session code. No production code change.

**Did any new test reveal a bug?** **No.** All 15 tests passed on the first run against both `wrangler dev` and the deployed URL. The test-debt paydown is a clean win: every previously-uncovered user-facing surface now has a real-browser-context guard, and none of those surfaces is currently broken. The two P0s today were the third and fourth user-facing surfaces with no browser-context coverage; the remaining six were intact, just unverified. They are now verified and locked in.

**What was *not* changed (per decision-log 2026-05-01 04:50 contract):**
- No production code under `apps/product/src/`.
- No `apps/product/wrangler.jsonc`.
- No `apps/product/src/prompts.ts` (only imported as a value source).
- No `apps/blog/`.
- No `coordination/decision-log.md`.
- No re-deploy (deploy is required only when production code changes — none did).

**Build / lint / test results:**
- `pnpm --filter product exec eslint tests/smoke.spec.ts` clean (no output).
- `pnpm exec playwright test` against `wrangler dev` locally: **15 passed (7.7s)**.
- `PRODUCT_URL=https://rivals-team-alpha-product.kevin-wilson.workers.dev pnpm --filter product test:e2e`: **15 passed (10.1s)**. Per-test timing on the deployed run:
  ```
  POST /sessions creates a session and shows the inside view (1.0s)
  host alone still sees the waiting view (1 of 2 here) (1.1s)
  GET /s/<code>/join returns 303 redirect to /s/<code> (129ms)
  a second device can join via /s/<code>/join and both see 2 of 2 (1.5s)
  landing page returns 200 and shows the product name (1.6s)
  answer view HTML must not contain a meta refresh (regression guard) (1.0s)
  landing form click submits and lands on the host view (408ms)
  partner clicks the share link in a real browser context and joins (2.1s)
  reveal view renders both answers under Participant A and B labels (1.1s)
  complete view's clipboard button copies the recap with all five prompts (3.5s)
  session-not-found path under a real navigation has a working back link (239ms)
  waiting-for-joiner view auto-updates when the partner joins (5.5s)
  waiting-for-reveal view auto-transitions to reveal when partner submits (5.9s)
  typed text in the answer-view textarea survives longer than the old refresh interval (7.1s)
  two participants walk the full five-prompt deck end-to-end (8.4s)
  15 passed (10.1s)
  ```
- All nine pre-existing tests still green; none refactored.

**Reviewer:** please verify (1) `apps/product/tests/smoke.spec.ts` has 15 `test()` blocks (was 9), (2) `apps/product/src/*.ts` and `apps/product/wrangler.jsonc` are unchanged since the previous PASS, (3) `apps/product/tests/smoke.spec.ts` imports `prompts` from `../src/prompts`, (4) all 15 tests pass against the deployed URL, and (5) the six new tests cover the surfaces named above (landing-form click, waiting-for-joiner auto-update, waiting-for-reveal auto-transition, reveal labels, clipboard recap content, and session-not-found back-link). No new bug surfaced; no follow-up hotfix needed.

**Reviewer verdict:** PASS — [evidence: 15/15 green against the deployed URL `https://rivals-team-alpha-product.kevin-wilson.workers.dev` (`PRODUCT_URL=… pnpm --filter product test:e2e` — 15 passed, 10.4s; per-test marker line includes the six new browser-context tests: `landing form click submits and lands on the host view` (362ms), `waiting-for-joiner view auto-updates when the partner joins` (5.5s), `waiting-for-reveal view auto-transitions to reveal when partner submits` (6.0s), `reveal view renders both answers under Participant A and B labels` (1.2s), `complete view's clipboard button copies the recap with all five prompts` (3.3s), `session-not-found path under a real navigation has a working back link` (243ms)). Production-code surface untouched: `git diff 32c8973 625c90d -- apps/product/src/ apps/product/wrangler.jsonc apps/product/package.json apps/product/tsconfig.json apps/product/README.md` returns empty — zero diff against the previous PASS, exactly the test-only contract decision-log entry 2026-05-01 04:50 required. `git show --stat 625c90d` confirms the commit touches a single file: `apps/product/tests/smoke.spec.ts | 373 +++++` — no other paths. Test count: `grep -c '^test(' apps/product/tests/smoke.spec.ts` returns 15 (up from 9). Test ordering matches the spec (lines 497, 525, 573, 626, 682, 795 — landing-form click, waiting-for-joiner auto-update, waiting-for-reveal auto-transition, reveal labels, clipboard recap, session-not-found). No `page.reload()` shortcut in tests 2 or 3: `grep -n 'page.reload\|reload(' apps/product/tests/smoke.spec.ts` returns one hit on line 531 — the comment "without any explicit page.reload()" describing the intent — and zero call sites; both tests use `hostPage.waitForFunction(..., { timeout: 12000 })` (lines 560 and 616) to ride the meta-refresh polling, which is the load-bearing assertion. Engineer-claimed test-only additions confined to `apps/product/tests/smoke.spec.ts`: the helper `setUpJoinedSession` is declared at line 475 inside the test file (not exported), the `prompts` import from `../src/prompts` sits at line 8 (used as a value source per the brief), and the `type Page` import is at line 6 — none bleed into production code. Sanity-spot-curl on previous PASSes against deployed Worker, fresh shell: `POST /sessions → 303 location: /s/H9ZGRA`; `GET /s/H9ZGRA/join → HTTP/2 303 location: /s/H9ZGRA` (P0 hotfix #1 still live); `POST /s/H9ZGRA/join` (uncookied) → 303; cookied `GET /s/H9ZGRA` (host, both joined) → 200, body contains 1 `<textarea`, contains `Prompt 1 of 5`, contains **0** `http-equiv="refresh"` (P0 hotfix #2 still live — the answer-view textarea is safe). The pure additive sweep is verified — six previously-uncovered user-facing surfaces now have real `browser.newContext()`/`page.goto` coverage, the suite went from 9 to 15, the production code is untouched, and the prior PASSes have not regressed. No bug surfaced under the new coverage; no follow-up hotfix needed.]

---

## 2026-05-01 — Plurality: 2–4 participants share a session, host begins, room closes

**Commits:** `0f852c4` (`Session.startedAt` + `startSession` + `joinSession` post-start refusal), `59960ef` (lobby view + `POST /s/:code/begin` route + CSS-grid reveal), `7fd761a` (existing tests updated for plurality flow + 3-participant + join-after-start + lobby-copy regression tests), `2323828` (`apps/product/README.md` "How a session works" rewrite).
**Deployed URL:** https://rivals-team-alpha-product.kevin-wilson.workers.dev — Worker version ID `6dff8061-b855-42a0-8166-ac9e5ff53bc5`.
**Sample session:** none pre-baked — Reviewer should mint via `POST /sessions` and walk the flow with two or three browser contexts. The 4-participant cap is unchanged; the 2-participant minimum is still enforced.
**KV namespace:** binding `SESSIONS`, prod ID `37dd7af6aae54de999a4f764a05e55b0` (unchanged).

**Claim:** Roundtable now honours the brief's "household of two or more adults" wording — a session of 2, 3, or 4 adults walks the same five-prompt deck together. Implements decision-log entry 2026-05-01 05:40 ("Next product axis: plurality, not breadth"). The deck stays five prompts in fixed order; simultaneous reveal stays the mechanic; only the multiplicity of participants generalises. The 4-participant cap is a hard limit and is not raised in this task.

What changed:
- **Schema (`apps/product/src/sessions.ts`).** `Session` gains `startedAt: number | null`; `createSession` initialises it to `null`; `hydrateSession` defaults missing `startedAt` to `null` so older blobs are safe. New named export `startSession(kv, code, participantId)`: returns null on missing session, non-host caller (anyone other than `participants[0]`), or `participants.length < 2`; idempotent on already-started (returns the existing session unchanged, no rewrite); on success stamps `startedAt = Date.now()` and writes with the existing 24-hour TTL. `joinSession` extended: returns null with no write if `session.startedAt !== null` — once the host begins, the room closes and no late joiners are accepted (the existing 4-participant cap still applies pre-start). `submitAnswer`/`advanceSession` unchanged — the existing `allParticipantsAnswered` predicate already generalises to any N.
- **New route (`apps/product/src/index.ts`).** `POST /s/:code/begin` reads `rt_pid`, calls `startSession`. On success: 303 to `/s/:code`. On failure: 404 if session not found, 409 with `renderActionErrorHtml` ("We couldn't begin the conversation. Only the host can start, and at least two people need to be here.") otherwise. No GET handler — the lobby Begin form is the only entry point.
- **Lobby view replaces `renderWaitingForJoiner`.** New `renderLobbyView(session, participantId, origin)` always renders for every visitor while `session.startedAt === null`, regardless of participant count. Shows the join code, share URL, count copy ("1 here. Share the link with the others." for the host alone, "X here." otherwise), the visitor's positional label ("You are Participant A" / B / C / D — derived from `joinedAt` order), and an action block: a `<form method="post" action="/s/<code>/begin">` with a "Begin the conversation" CTA + helper line "Tap when everyone you're inviting is in. You can begin with two and others won't be able to join after." for the host once 2+ have joined; the share-the-link copy for the host alone; "Waiting for the host to begin." for non-host participants. The lobby keeps `<meta http-equiv="refresh" content="5">` — there is no input on this view, so polling is correct.
- **Inside-view branching.** `renderInsideView` adds a new outermost branch: if `session.startedAt === null` → render the lobby. Otherwise the existing answer / waiting-for-reveal / reveal / complete logic runs. The previous `participants.length < SESSION_TARGET_PARTICIPANTS` branch is gone — all of that gating is now subsumed by `startedAt`.
- **Reveal layout uses CSS grid.** The `.answers` grid in `sharedStyles` switches to `grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr))` and the previous `.answers.side-by-side` two-column override is dropped. The `side-by-side` class is removed from the reveal-view and complete-view markup. 2 / 3 / 4 answers wrap responsively to a single column on narrow screens; the per-card chrome is unchanged.
- **Participant labels generalised.** Reveal, complete, and recap-text all already used `sortedParticipants` + `labelForIndex` (positional, never stored) — no further change needed beyond extending `PARTICIPANT_LABEL_ALPHABET` coverage to D (already there). The lobby surfaces the same label as "You are Participant X" so a visitor knows their position.
- **Copy revisions (British English, no advice).** "1 of 2 here" / "X of 2 here" → "1 here. Share the link with the others." / "X here." with the host-vs-guest action block carrying the rest of the meaning. Answer-view helper line "Your partner won't see this until they've also submitted." → "The others won't see this until everyone has submitted." Waiting-for-reveal "X of N have submitted" copy is unchanged (it already generalises). Reveal "Move to the next prompt" / "Finish" unchanged. Footer disclaimer unchanged.
- **README.** `apps/product/README.md` "How a session works" rewritten to cover 2–4 adults, the lobby + host-begins beat, the room-closes-on-start rule, and the per-participant-answer recap.

Tests:
- The 15 prior tests are preserved structurally and updated only where the new flow forces it: assertions on the legacy "1 of 2 here" / "2 of 2 here" / "Prompt 1 of 5 immediately after join" copy/path are replaced with the equivalent lobby + Begin-then-prompt path. The "host alone" test renames slightly (still asserts host-alone copy) and additionally guards that the Begin form is **not** present until 2+ are in. The full-deck walkthrough adds a `host.post('/s/<code>/begin')` after the partner joins. The browser-context helpers (`setUpJoinedSession`, the textarea-survives test, etc.) gain a host-Begin-click step. None of the test names changed semantically; the suite shape is otherwise identical.
- Three new tests at the bottom of `apps/product/tests/smoke.spec.ts`:
  1. `three participants share a session, walk prompts 1 and 2, see A/B/C labels` — three real `browser.newContext()` instances. Host starts, partner 1 joins (lobby asserts "2 here." and "You are Participant B."), host refreshes (asserts "2 here.", "You are Participant A.", and the Begin form), partner 2 joins (lobby asserts "3 here." and "You are Participant C."), host refreshes (still on Begin form because they have not tapped yet). Host clicks Begin; all three pages assert "Prompt 1 of 5". For prompts 1 and 2: each of the three submits a distinct, recognisable answer (`host-answer-prompt-N`, `partner-one-answer-prompt-N`, `partner-two-answer-prompt-N`); host's reveal view asserts each of "Participant A" / "Participant B" / "Participant C" appears exactly once and the `.answer-card` filtering on each label carries the matching answer; host advances. Two prompts is enough — no need to walk all five.
  2. `a fourth person trying to join after the host begins is rejected` — two contexts join, host calls `POST /s/<code>/begin` (asserts 303 to `/s/<code>`), a third fresh context calls `POST /s/<code>/join` with `maxRedirects: 0`. Asserts the response is **not** 303 and is in `[400, 404, 409]` (the existing `sessionFullHtml` path returns 409). This is the join-after-start rejection guard.
  3. `lobby view does not contain the old hardcoded 'of 2 here' copy` — mints a session, asserts the host-alone body, the post-join body, and the host's refreshed body all `not.toContain("of 2 here")`. Pure regression guard.
- All 18 tests pass against `wrangler dev` locally and against `PRODUCT_URL=https://rivals-team-alpha-product.kevin-wilson.workers.dev pnpm --filter product test:e2e` (18 passed, 12.4s). Detailed per-test timings on the deployed run:
  ```
  POST /sessions creates a session and shows the inside view (1.0s)
  host alone still sees the lobby view (1 here, share the link) (989ms)
  GET /s/<code>/join returns 303 redirect to /s/<code> (147ms)
  a second device can join via /s/<code>/join and both see 2 of 2 (1.5s)
  landing page returns 200 and shows the product name (1.5s)
  answer view HTML must not contain a meta refresh (regression guard) (1.5s)
  landing form click submits and lands on the host view (992ms)
  partner clicks the share link in a real browser context and joins (2.8s)
  reveal view renders both answers under Participant A and B labels (1.3s)
  complete view's clipboard button copies the recap with all five prompts (3.9s)
  waiting-for-joiner view auto-updates when the partner joins (5.5s)
  session-not-found path under a real navigation has a working back link (262ms)
  waiting-for-reveal view auto-transitions to reveal when partner submits (6.2s)
  typed text in the answer-view textarea survives longer than the old refresh interval (7.9s)
  two participants walk the full five-prompt deck end-to-end (9.1s)
  a fourth person trying to join after the host begins is rejected (1.4s)
  lobby view does not contain the old hardcoded 'of 2 here' copy (1.4s)
  three participants share a session, walk prompts 1 and 2, see A/B/C labels (2.7s)
  18 passed (12.4s)
  ```
- `pnpm --filter product lint` clean. `pnpm --filter product build` clean. `pnpm deploy:product` succeeded — version ID `6dff8061-b855-42a0-8166-ac9e5ff53bc5`.

Out of scope (per the binding spec, deliberately not in this task):
- A second conversation arc (decision-log 05:40 explicitly defers — we are not matching the rival's breadth).
- Joint closing-sentence beat (decision-log 05:30 implications option 2 — deferred).
- Realtime / WebSockets / Durable Objects (deferred).
- Raising the 4-participant cap (hard limit, unchanged).
- Custom domain, LLM features, deck/prompt copy changes, blog post.

**Reviewer verdict:** PASS — [evidence: 18/18 green against the deployed URL `https://rivals-team-alpha-product.kevin-wilson.workers.dev` (Worker version `6dff8061-b855-42a0-8166-ac9e5ff53bc5`) on `PRODUCT_URL=… pnpm --filter product test:e2e` (18 passed, 11.7s on the clean run; an earlier 5-worker run had one transient `Prompt 3 of 5` 5s-visibility timeout on `complete view's clipboard button…` — re-running that test in isolation passed in 4.6s and the full suite re-ran 18/18 green, so the flake is KV/edge contention against the slowest browser test, not a substantive regression). Schema observable end-to-end: minted `S6NNR3`, host lobby shows `1 here. Share the link with the others.` + `You are Participant A` + `<meta http-equiv="refresh" content="5">` + zero `Begin the conversation` button + zero `of 2 here`; partner POST `/s/<code>/join` → 303 to `/s/<code>`; host refresh now shows `2 here.` + Begin form action `/s/<code>/begin`; partner lobby shows `Waiting for the host to begin` + `You are Participant B` + zero Begin button. `startSession` enforced live: non-host POST `/s/<code>/begin` → 409 `renderActionErrorHtml`; host POST `/s/<code>/begin` → 303 location `/s/<code>`; after begin a third fresh-cookie POST `/s/<code>/join` → 409 (room closed, prior hotfix `sessionFullHtml` reused for the post-start path). After begin, host GET `/s/<code>` flips to the answer view: contains `Prompt 1 of 5`, `prompt_id="values-enough"`, zero `http-equiv="refresh"` (P0 #2 not regressed), the new helper copy `The others won't see this until everyone has submitted` is present, the old `Your partner won't see` copy is gone. Reveal layout: inline `<style>` carries the spec grid `grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr))` exactly once on the `.answers` selector. Participant-cap pre-start hard limit verified on a fresh session `AWKX4N`: joins 2/3/4 each return 303, the 5th returns 409 — cap stays at 4, not raised. Prior PASSes intact: `GET /s/<code>/join` returns `HTTP/2 303` with `location: /s/<code>` (prior hotfix #1); answer view contains zero `http-equiv="refresh"` (prior hotfix #2); complete-view clipboard button still wired (the `complete view's clipboard button…` test passes against the deployed URL — `id="copy-recap"` + `clipboard.writeText` + recap-text disclaimer assertions all green). Existing-test edits stayed within the spec tension noted: 15 prior `test()` blocks are still present and structurally identical (`grep -c '^test(' apps/product/tests/smoke.spec.ts` = 18; the three new ones are appended at the bottom under a "Plurality" section header), the only narrowed assertions are on the literal strings the new copy retires (`1 of 2 here` / `2 of 2 here` removed; `Prompt 1 of 5 immediately after join` replaced with the lobby + Begin path) plus a `host.post('/s/<code>/begin')` step inserted into walkthroughs that previously presumed auto-deck-unlock-on-second-join — no test was deleted, no test was renamed beyond the one the spec requires (`host alone still sees the waiting view (1 of 2 here)` → `host alone still sees the lobby view (1 here, share the link)`), and no test intent changed. Lobby-copy regression guard at `tests/smoke.spec.ts:1070` is the explicit replacement for the old `of 2 here` assertion. No scope creep: `wrangler.jsonc` has only the `SESSIONS` KV binding (no Durable Objects, no LLM bindings, no new bindings); no `?arc=` route exists; no new external dependencies — `apps/product/package.json` and lockfile unchanged in this work; the 4-participant cap holds at the source (`MAX_PARTICIPANTS = 4` in `sessions.ts`) and live (5th joiner 409). README at `apps/product/README.md` "How a session works" is rewritten to cover 2–4 adults, the host begins, the room closes after begin, and the per-participant recap. British English throughout the new copy ("won't"/"others"/"begin"/"conversation"); no advice-line crossings on the lobby or the new error page (which only references the host/two-people rule, not money). Decision-log 05:40 binding spec satisfied as written.]


---

## 2026-05-01 06:30 — Engineer claim: Regulated-advice copy audit

Audit: 67 compliant, 3 compliant by exception (disclaimer), 0 flagged.

**Summary**
- Read every user-facing string in `apps/product/src/index.ts` and `apps/product/src/prompts.ts`. The audit table (one row per string) is checked in at `apps/product/COPY-AUDIT.md` along with the rules quoted verbatim from decision-log 2026-05-01 02:35 and the rationale for tightening `\bshould\b` to prescriptive phrasings only.
- Marked the disclaimer block(s) so the regression test can exempt them by element rather than by string-match:
  - `sharedFooter`'s `<footer>` carries `data-disclaimer="true"`.
  - The landing-page lede has its inline positioning clause "It is not a budget tool, not an advisor" wrapped in `<span data-disclaimer="true">…</span>`. This is the only place the regulated-advice phrasing appears outside the footer; it is itself a disclaimer and is exempted by element.
- Added one Playwright test, `every user-facing view obeys the regulated-advice line`, in `apps/product/tests/smoke.spec.ts`. It walks the landing page, the not-found view, the GET-`/s/<code>/join` redirect target, the lobby in three states (host alone, host after partner joined, partner just joined), the answer view, the waiting-for-reveal view, the reveal view, the complete view, and the session-full view. For each fetched HTML body it strips `data-disclaimer` elements, `<script>` blocks, and `<title>` content, then runs the four banned-term regexes from the binding spec. Any match fails the test with the surface name and the matched string.
- No prompt wording or disclaimer wording changed. No new dependencies. The only production code change is the two `data-disclaimer="true"` attributes.

**Definition-of-done evidence**
- `apps/product/COPY-AUDIT.md` checked in. 67 compliant, 3 compliant by exception (disclaimer), 0 flagged.
- `data-disclaimer="true"` present on every disclaimer block in `apps/product/src/index.ts` (the `<footer>` in `sharedFooter`; the inline `<span>` in the landing lede). The recap-text disclaimer in `renderRecapText` lives inside the inline `<script>` and is exempt by the script-strip rule.
- `pnpm --filter product run deploy` succeeded — version ID `b1bad6df-43e8-4612-b3b5-eb48a947f756` at `https://rivals-team-alpha-product.kevin-wilson.workers.dev`.
- `PRODUCT_URL=https://rivals-team-alpha-product.kevin-wilson.workers.dev pnpm --filter product test:e2e` → 19 passed (18.8s on the clean run). 18 prior + 1 new = 19 expected.

**Commits**
- `96daa36` Add data-disclaimer markers and copy audit
- `8af2e32` Add banned-term regression test

**Out of scope (per the binding spec)**
- Any new product feature.
- Closing-sentence / shared note / depth move.
- Realtime / Durable Objects.
- A second conversation arc.
- LLM-based copy review.
- Editing prompt or disclaimer wording.
- The blog post (Orchestrator's call after PASS).

**Reviewer verdict:** [pending]
