# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Pure test-coverage sweep. Add real-browser-context Playwright tests covering the user-facing surfaces that have not yet been exercised through a real `page`/`browser.newContext()` walk. **No production code changes** in this task — if a test fails, you stop, set Status to `blocked`, and report the failure with evidence. The Orchestrator will decide on a follow-up hotfix; you will not patch in-line.

Read first:
- `coordination/decision-log.md` entry **2026-05-01 04:50 ("Test-coverage sweep")** — binding spec. The "Choice" and "Rationale" sections are the contract.
- `apps/product/src/index.ts` — for an authoritative list of user-facing render functions and their HTML structure.
- `apps/product/tests/smoke.spec.ts` — extend, do not refactor.

What to add (six tests; one focused per surface, in this order):

1. **Landing → form submission as a user.** Use `page.goto('/')`, click the "Start a session" `<button type="submit">` inside the form. Follow the redirect via Playwright's default behaviour. Assert `page.url()` matches `/s/[2-9A-HJ-KMNP-Z]{6}` (six-char unambiguous alphabet). Assert the page contains a 6-character code in a visible element and "1 of 2 here" copy. This is distinct from the existing `request.post('/sessions')` test because it exercises form-action wiring, redirect cookie handling under a real user agent, and the rendered host view.

2. **Waiting-for-joiner view auto-updates when the partner joins.** Open two `browser.newContext()` instances. Host: start a session via the form, land on the waiting view. Confirm the host's page shows "1 of 2 here". Then in the partner context: navigate to the share URL, click "Join this session". Back in the host's `page`: do **not** call `page.reload()` — instead, `page.waitForFunction(() => document.body.textContent.includes('2 of 2 here'), null, { timeout: 10000 })`. The host's meta-refresh has 5s interval, so 10s should comfortably catch the next refresh cycle even with KV propagation. If this times out, the meta-refresh polling is broken — STOP and report; do not patch.

3. **Waiting-for-reveal view auto-transitions to reveal when partner submits.** Two contexts, both joined, both on the answer view. Host types and submits an answer. Host's page should now be on the waiting-for-reveal view ("You've submitted. Waiting for the others."). Then partner types and submits. On the host's page, `page.waitForFunction` until the body contains "Move to the next prompt" (the reveal-view CTA), within 10s. If this times out, the reveal-step polling is broken.

4. **Reveal view renders both answers with correct Participant A / B labels.** Continue from test 3 (or set up fresh). Once the host is on the reveal view, assert: the page contains "Participant A" and "Participant B" exactly once each (use `page.locator('text=Participant A')` count = 1). Assert the answer text submitted by the *first joiner* is rendered next to "Participant A" and the second joiner's text next to "Participant B". To do this, type **distinct, recognisable strings** in test 3 (e.g. `"hostAnswerForReveal-12345"` and `"partnerAnswerForReveal-67890"`) and locate them by partial text match.

5. **Complete view's clipboard button is wired and works.** Walk through the deck (5 prompts × 2 participants × submit + advance). On the complete view, `await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])` for the host's context, click `#copy-recap`, then `const clipText = await page.evaluate(() => navigator.clipboard.readText())`. Assert the clipboard text contains "Roundtable — conversation recap", contains all 5 prompt texts (use the `prompts` exported from `apps/product/src/prompts.ts` — import it in the test file), and contains the "does not provide financial, tax, legal, or investment advice" disclaimer line. If clipboard permissions don't work in headless Chromium for any reason, fall back to checking the inline `<script>` content for the recap text and asserting the click handler is wired (the existing static check already covers the latter — extend it). Do NOT skip this — at minimum confirm the recap content is present in the served HTML.

6. **"Session not found" path under a real navigation.** `page.goto('/s/NOTREAL')` should land the user on a 404-flavoured page with the copy "This session has ended or never existed" and a working "Back to the start" link to `/`. Assert `page.title()` indicates a not-found state and that clicking the back link returns the user to the landing page (the "Start a session" form is visible again). This is distinct from the existing `request.get('/s/NOTREAL')` test because it exercises the rendered HTML *and* the back-link's reachability.

Constraints:
- **No production code changes.** Do not modify `apps/product/src/*.ts`, `apps/product/wrangler.jsonc`, `apps/product/src/prompts.ts`, or any user-facing copy. The whole task is in `apps/product/tests/smoke.spec.ts`.
- If any test fails, **stop**: set Status to `blocked`, paste the failure output and your hypothesis about which surface is broken, and hand back. Do not patch the production code in-line. The Orchestrator will write a hotfix decision.
- Reuse existing helpers where possible (the test file already has helpers from previous tasks). Do not refactor existing tests.
- TypeScript: no `any`, named exports, curly braces on every conditional. Importing from `apps/product/src/prompts.ts` in the test is fine.
- British English in any new helper strings, test names, or comments. (Test names like `'landing form click submits and lands on the host view'` are fine.)
- Do not sign commits. One commit is fine for all six tests; if you split, split per-test (six commits) — not per cluster.
- Do not deploy. **Tests run against the deployed URL via `PRODUCT_URL=...` in the suite invocation; you don't need a fresh deploy.** A deploy is only required when production code changes — none does here.

Definition of done:
- Six new `test()` blocks land in `apps/product/tests/smoke.spec.ts`.
- All existing tests still pass.
- All six new tests pass against `wrangler dev` locally **and** against the deployed URL via `PRODUCT_URL=https://rivals-team-alpha-product.kevin-wilson.workers.dev`.
- Total suite goes from 9 tests to 15.
- Entry appended to `coordination/review-queue.md` describing the sweep, listing the surfaces covered, and noting whether any of the six surfaces required a follow-up (i.e. did any of the new tests reveal an existing bug?).
- Status field below set to `awaiting-review`.

If you are blocked:
- Status `blocked` with a one-line description of which test failed and what it surfaced.
- Do not push partial code that papers over a failing test.

Out of scope:
- Production code changes.
- Replacing meta-refresh polling with JS or WebSockets.
- Realtime / Durable Objects.
- Any feature work, copy revision, schema change, route addition, or new dependency.
- A blog post.
- A rival check.

**Assigned:** 2026-05-01 04:55 UTC — Engineer
**Status:** assigned
**Notes:** Time budget: ~60 minutes. This is a deliberate test-debt paydown after two P0s today. Tests are the deliverable; finding a bug counts as success — the Orchestrator handles the hotfix decision separately if you find one.
