# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Add a "closing note" — a single shared free-text field on the complete view that any participant can write or revise. Latest version wins. Travels with the recap to the clipboard and the printed artefact. Empty by default; if no-one fills it in, no closing-note section appears in the take-away.

This is the **plural depth** beat we have been deferring since the rival-state implications at 05:30. The point is one *we* sentence after a deck of five *I* answers — distinct from the rival's per-partner reflection step. Decision log entry **2026-05-01 06:50 ("Plural depth: a shared closing sentence on the complete view")** is the binding spec.

Read first:
- `coordination/decision-log.md` entry **2026-05-01 06:50** — binding contract. The "Concrete scope" subsection is the contract.
- `apps/product/src/sessions.ts` — extend.
- `apps/product/src/index.ts` — extend the complete view + `renderRecapText` + the clipboard-recap inline script.
- `apps/product/COPY-AUDIT.md` — you will be adding new user-facing strings; they must obey the same rules. Add them to the audit table in the same commit.
- `apps/product/tests/smoke.spec.ts` — extend.

What to build:

1. **Schema extension in `apps/product/src/sessions.ts`:**
   - Add to `Session`:
     - `closingNote: string` (default `""`).
     - `closingNoteUpdatedBy: string | null` (default `null`).
     - `closingNoteUpdatedAt: number | null` (default `null`).
   - Add named export `setClosingNote(kv: KVNamespace, code: string, participantId: string, text: string): Promise<Session | null>`:
     - Returns null if session not found, participant not in session, or `session.completedAt === null` (cannot set before deck completes).
     - Trims input. Caps trimmed text at 280 characters (truncate, do not reject — preserve the user's effort).
     - Empty-after-trim is **allowed** as a delete: clears `closingNote` and clears the metadata fields too (sets them all back to `""` / `null` / `null`).
     - On non-empty: sets `closingNote = trimmed`, `closingNoteUpdatedBy = participantId`, `closingNoteUpdatedAt = Date.now()`.
     - Writes with the existing 24-hour TTL.

2. **New route in `apps/product/src/index.ts`:**
   - `POST /s/:code/closing-note` — read `rt_pid`; read form field `text` (may be empty); call `setClosingNote`. On success, 303 redirect to `/s/<code>`. On failure (any null return — pre-completion call, missing session, non-participant), render the existing-style error page with a back link to `/s/<code>`.

3. **Complete-view render changes in `apps/product/src/index.ts`:**
   - At the top of the complete view, add a `<section class="closing-note">` with:
     - `<h2>One last thing — together.</h2>`
     - `<p class="helper">Is there a sentence you'd like to take away from this conversation? Anyone here can write or revise it. Refresh to see updates from the others.</p>`
     - `<form method="post" action="/s/<code>/closing-note">` with `<textarea name="text" maxlength="280" rows="2">` pre-filled with the current `closingNote` (HTML-escaped), then a submit `<button type="submit">Save this sentence</button>`.
     - Below the form: if `closingNoteUpdatedBy` is non-null, render `<p class="last-saved">Last saved by Participant X at HH:MM</p>` where the label is derived positionally from `participants` order (same A/B/C/D rule as the rest of the product) and the time renders the saved `closingNoteUpdatedAt` as `HH:MM` UTC (server-side string formatting is fine; do not add JS just for time-zone conversion).
     - If `closingNoteUpdatedBy` is null, render `<p class="last-saved">Nothing saved yet.</p>` instead.
   - **Do NOT add `<meta http-equiv="refresh">` to the complete view.** The textarea would be cleared exactly like the answer-view P0 bug we already fixed. The helper line tells the user to refresh manually. The existing banned-pattern test already guards against the answer view; the complete view is also at risk now and the same logic applies — confirm the complete view stays free of `http-equiv="refresh"` after your changes.
   - Below the closing-note section, render the existing recap, *plus*: if `session.closingNote !== ""`, prepend a labelled block to the recap (a `<div class="recap-closing">` with the heading "Together" and the saved sentence, plus "Last saved by Participant X at HH:MM"). If empty, the recap shows the per-prompt blocks as today.

4. **`renderRecapText` (the plain-text recap in `index.ts`) update:**
   - If `session.closingNote !== ""`, prepend to the existing recap text:
     ```
     Together — last saved by Participant X at HH:MM (UTC):
     <closingNote text>
     
     ```
     Then the existing five prompt blocks. Then the existing trailer.
   - If empty, recap text is unchanged from today.
   - The clipboard inline `<script>` payload must reflect this — i.e. when the user clicks "Copy to clipboard", they get the closing-note section if filled in, or not if empty.

5. **Print stylesheet update (the existing `@media print` block):**
   - Hide the closing-note **input section** (heading + textarea + submit button + last-saved label) — these are not part of the printed artefact.
   - Keep the recap-closing block visible — that is part of the artefact.
   - Use a dedicated wrapper class so the print stylesheet can target it cleanly.

6. **Copy audit update — `apps/product/COPY-AUDIT.md`:**
   - Add new rows for every new user-facing string you introduce: `One last thing — together.`, the helper line, the textarea placeholder if any, the submit button label, the last-saved labels (`Last saved by Participant X at HH:MM`, `Nothing saved yet.`), the recap-closing heading (`Together`), the plain-text recap line (`Together — last saved by Participant X at HH:MM (UTC):`).
   - Each row gets a verdict. Expected: all `compliant`. If any reads as crossing the line in your audit, **stop**, set Status to `blocked`, and report.
   - Update the row count and the "audit performed" paragraph at the bottom.
   - The existing banned-term test will run against the new strings automatically — that is by design.

7. **Tests in `apps/product/tests/smoke.spec.ts`:**
   - Extend the existing 2-participant deck-walkthrough test (the request-context one) so that after deck completion:
     - Host POSTs to `/s/<code>/closing-note` with a recognisable text (e.g. `"What a great conversation we had today, hosted via the closing note test."`).
     - Re-fetches `/s/<code>` and asserts the recap-closing block contains the saved text and "Last saved by Participant A".
     - Asserts the plain-text recap inside the inline `<script>` contains the closing-note line.
     - Then host POSTs an empty `text` to `/s/<code>/closing-note`, re-fetches, and asserts the closing-note section now shows "Nothing saved yet." and the recap no longer prepends a closing-note block.
   - Add a static check on the complete view: confirm the rendered HTML does **not** contain `http-equiv="refresh"` (regression guard, in case anyone re-introduces polling on this view by mistake).
   - Add a `setClosingNote` rejection check: try POSTing to `/s/<code>/closing-note` *before* the deck completes — expect a non-303 / error response.
   - The existing 19 tests must continue to pass against the deployed URL.

8. **README — `apps/product/README.md`:**
   - Add one short line under "How a session works" noting that after the deck, anyone present can write a single shared sentence to take away. One line.

Constraints:
- Stay inside `apps/product/`. Never edit `apps/blog/` or `coordination/decision-log.md`.
- TypeScript: no `any`, prefer `type`, named exports, curly braces on every conditional.
- British English in all human-facing copy.
- Do not sign commits. Commit small (schema → route → render + recap text → print css → audit + tests + README — separate commits preferred).
- The complete view must not gain a `<meta http-equiv="refresh">`. If you find yourself wanting one, stop and ask — the closing-note view has live input.

Definition of done:
- `Session` extended with `closingNote`, `closingNoteUpdatedBy`, `closingNoteUpdatedAt`.
- `setClosingNote` exported and behaves as specified, including the empty-as-delete semantic.
- `POST /s/:code/closing-note` route works.
- Complete view renders the closing-note input section and (when non-empty) the recap-closing block.
- `renderRecapText` and the inline clipboard script reflect the closing note.
- Print stylesheet hides the input section, keeps the saved value.
- `apps/product/COPY-AUDIT.md` updated with all new strings, all `compliant`, audit row count corrected, audit-performed paragraph updated.
- All existing tests continue to pass.
- New closing-note coverage (set / clear / pre-completion rejection / no-meta-refresh static guard) lands.
- `pnpm --filter product deploy` succeeds.
- All Playwright tests pass against the deployed URL after deploy.
- Entry appended to `coordination/review-queue.md` with the deployed URL and commit shas.
- Status field below set to `awaiting-review`.

Out of scope:
- Realtime / Durable Objects / WebSockets.
- Per-participant reflections (the rival's depth move; we are explicitly NOT doing that).
- Locking / consensus mechanism on the closing note. Last write wins. Disagreement is a discussion seed, not a bug.
- Multiple closing notes / per-prompt reflections.
- Customising the recap layout further.
- LLM features.
- A blog post.

**Assigned:** 2026-05-01 06:55 UTC — Engineer
**Status:** awaiting-review
**Notes:** Time budget: ~75 minutes. Largest single change since plurality. The novel mechanic here — "any participant can edit a shared field, last write wins, refresh to see updates" — is a deliberate counter to realtime; document the manual-refresh expectation honestly in the helper copy.

Engineer hand-off: shipped commits `d1e52e0` (schema), `f97a615` (route), `99d82bf` (render + recap), `2cc2c7d` (audit/tests/README). Deployed Worker version `4edb0b0e-2d77-4e4f-8adc-beb56e28cc98` at https://rivals-team-alpha-product.kevin-wilson.workers.dev. Full Playwright suite 20/20 green against the deployed URL. Review-queue entry appended.
