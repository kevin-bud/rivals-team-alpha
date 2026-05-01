# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Regulated-advice copy audit. Produce an audit document, mark up the disclaimer block(s) so they can be exempted from a banned-term test, and add a Playwright test that walks every reachable user-facing view and fails the build if any non-disclaimer text contains advice-flavoured language. The decision log entry **2026-05-01 06:15 ("Regulated-advice copy audit")** is the binding spec.

Read first:
- `coordination/decision-log.md` entry **2026-05-01 06:15** — binding contract.
- `coordination/decision-log.md` entry **2026-05-01 02:35** — the rules the audit enforces (open, value/feeling-oriented, no advice, no specific amounts, British English).
- `apps/product/src/index.ts` — every user-facing string lives here. Read every render function.
- `apps/product/src/prompts.ts` — the five prompt strings.
- `apps/product/tests/smoke.spec.ts` — extend.

What to do:

1. **Add a `data-disclaimer` attribute** to the existing footer container that holds the regulated-advice disclaimer (the line "Roundtable does not provide financial, tax, legal, or investment advice…" and surrounding text). Whatever element wraps that block — likely a `<footer>` or a `<div class="disclaimer">` inside the `sharedFooter` constant — gets `data-disclaimer="true"` added. This is the one production-code change in this task. If the disclaimer copy is duplicated in places not currently inside a single container (e.g. the recap text, an error page), wrap it in a small element with the attribute. Do **not** edit the wording of any disclaimer.

2. **Write `apps/product/COPY-AUDIT.md`.** Format:
   - Top: the rules from decision-log 2026-05-01 02:35 quoted verbatim (Open. Value/feeling-oriented. No specific amounts/percentages/products/tax/legal/investment terminology. Symmetrical. British English.).
   - Middle: a table with columns `Surface | String | Rule(s) | Verdict`. One row per user-facing string. The "Surface" is the render function name (e.g. `renderLanding`, `renderAnswerView`, `renderRevealView`, etc., or `prompts[N].text`). The "String" is the literal string or a unique-enough excerpt. The "Rule(s)" lists which of the rules above the string must obey. The "Verdict" is one of: `compliant`, `compliant by exception (disclaimer)`, `flagged`. We expect **zero `flagged` entries**. If you find any, **stop, set Status to `blocked`**, and report — the Orchestrator will decide on a copy revision separately. Do not paper over.
   - Bottom: one short paragraph stating the audit was performed by an automated walk of the source plus a manual reading, and the date (2026-05-01).
   - The file is checked-in evidence; treat the wording as part of the artefact. British English.

3. **Banned-term regression test in `apps/product/tests/smoke.spec.ts`.** A new `test()` block, browser-context (use `request.get` for plain HTML fetches; the test does not need a real `page`). For each of these paths, fetch the rendered HTML:
   - `/` (landing)
   - `/s/<a-real-code>/join` (the GET redirect target — should follow the 303 to the lobby/join view)
   - `/s/<a-real-code>` with the host's cookie before any partner has joined (waiting-for-joiner / lobby view)
   - `/s/<a-real-code>` with the host's cookie after the partner has joined and the host has begun the conversation (answer view)
   - `/s/<a-real-code>` after the host has submitted but the partner has not (waiting-for-reveal view)
   - `/s/<a-real-code>` after both have submitted (reveal view)
   - `/s/<a-real-code>` after the deck is exhausted (complete view)
   - `/s/NOTREAL` (session-not-found view)
   - The "session full" error page if you can reach it (POST a 5th `/s/<code>/join` after begin or before; the cap rules are in `joinSession`).

   For each fetched HTML body, do the following:
   - Strip any element with `data-disclaimer="true"` and its descendants from the HTML (use a lightweight regex or DOM parse via `parse5` if you don't want a regex; whichever is reliable on the project's existing tooling — DO NOT add a new dependency, prefer a regex strip).
   - Strip any `<script>...</script>` blocks (the inline clipboard JS contains the recap-text payload which itself contains the disclaimer phrasing — exempt scripts wholesale to avoid double-counting).
   - Strip the `<title>...</title>` content (titles legitimately mention "Roundtable" but should not contain banned terms; you can also leave titles in if they don't trigger the regex on the views above).
   - Run the following case-insensitive regexes against the remaining text. If any match, fail the test with the matched string and the surface name:
     - `\b(invest(ed|ing|ment|ments)?|tax(es|ation)?|legal|recommend(s|ed|ing)?|advise[ds]?|adviser|advisor|ought to)\b`
     - `\bshould\b` — but only in user-facing prose; if this is too noisy (the word might appear in legitimate copy), tighten to phrases like `you should\b|should we\b|should you\b|we should\b`. Your judgement; document the choice in `COPY-AUDIT.md`.
     - `[£$€¥]\s*\d`
     - `\b\d+\s*%\b`

   Test name: `'every user-facing view obeys the regulated-advice line'`. The test must pass against `wrangler dev` locally and against the deployed URL via `PRODUCT_URL=...`.

4. **Do NOT change**:
   - Any prompt wording (decision-log 02:35 fixes the deck verbatim).
   - The disclaimer wording.
   - Any user-facing copy beyond the addition of `data-disclaimer` attributes.
   - The session schema, KV bindings, routes (other than the attribute add).
   - `apps/blog/`, `coordination/decision-log.md`.

5. **Manual sanity** before claiming: paste a short summary of the audit table at the top of your review-queue claim — the count of compliant rows, any compliant-by-exception rows, and an explicit "0 flagged" (or, if non-zero, you stop and don't claim).

6. **Deploy.** `pnpm --filter product deploy` must succeed. After deploy, all Playwright tests (existing 18 + new 1 = 19) must pass against the deployed URL.

Constraints:
- Stay inside `apps/product/`. Never edit `apps/blog/` or `coordination/decision-log.md`.
- TypeScript: no `any`, named exports, curly braces on every conditional.
- British English throughout the audit document.
- Do not sign commits. Two or three commits is fine: attribute + audit doc + test.
- Do **not** add new dependencies. Use regex/string operations available in the existing toolchain.

Definition of done:
- `apps/product/COPY-AUDIT.md` checked in, with zero flagged entries.
- `data-disclaimer="true"` present on every disclaimer block in `apps/product/src/index.ts` (and any other place the disclaimer text appears).
- New test passes locally and against the deployed URL.
- Existing 18 tests still pass.
- `pnpm --filter product deploy` succeeds.
- Entry appended to `coordination/review-queue.md` with the audit summary and the deployed URL.
- Status field below set to `awaiting-review`.

Out of scope:
- Any new product feature.
- Closing-sentence / shared note / depth move (deferred — see rival-state 06:05 implications).
- Realtime / Durable Objects (deferred).
- Second arc (deferred-on-principle).
- LLM-based copy review (rejected on principle in decision-log 06:15).
- A blog post — Orchestrator's call after PASS.
- Editing prompts.ts wording.

**Assigned:** 2026-05-01 06:20 UTC — Engineer
**Status:** assigned
**Notes:** Time budget: ~45 minutes. The hard part is the audit; the test should be straightforward once the disclaimer block is marked up. If a flagged string appears, stop — do not silently rewrite copy without a decision.
