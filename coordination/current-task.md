# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Add a take-away affordance to the **complete view** (the view shown after a session has worked through all five prompts). Two pieces, both client-side, no new storage, no new routes, no schema changes:

1. A **"Copy this conversation" button** that copies a plain-text version of the recap to the user's clipboard.
2. A **print stylesheet** (`@media print`) that strips chrome from the complete view so participants can browser-print to PDF on their own device.

Read first:
- `coordination/decision-log.md` entry **2026-05-01 03:30** — this is the spec. The "Choice" and "Rationale" sections are binding.
- `coordination/rival-state.md` entry 2026-05-01 03:15 — context: the rival "Common Ground" offers a server-rendered PDF; we are deliberately responding with on-device-only affordances instead.
- `apps/product/src/index.ts` — specifically the complete-view render path you'll modify.
- `apps/product/tests/smoke.spec.ts` — extend.

What to build:

1. **Plain-text recap format.** Define a single function `renderRecapText(session, participantLabels)` (or inline helper — your call, but keep it pure and exported if you split it out so it is unit-testable later). The format, exactly:

   ```
   Roundtable — conversation recap

   Prompt 1: <prompt text>
   Participant A: <their answer>
   Participant B: <their answer>

   Prompt 2: <prompt text>
   Participant A: <their answer>
   Participant B: <their answer>

   ...

   Generated <ISO date of completedAt> from a Roundtable session. Roundtable does not provide financial, tax, legal, or investment advice.
   ```

   Use `\n` line breaks (not HTML). The participant labels are positional ("Participant A", "Participant B", …) — same derivation rule as elsewhere. If a participant submitted nothing for a prompt (shouldn't happen with the reveal lock, but defensively), render `Participant X: (no answer)`.

2. **"Copy this conversation" button on the complete view.** Render the plain-text recap into a `<script>` block as a JSON-encoded string (so any quotes/newlines survive HTML-encoding cleanly):

   ```
   <script>
     const recapText = "...";  // JSON.stringify on the server, dropped in here
     // attach click handler to #copy-recap that calls navigator.clipboard.writeText(recapText)
     // briefly toggle button label to "Copied" for ~1.5s on success
   </script>
   ```

   Or equivalent — the contract is just "button click puts the recap on the clipboard, with a visible confirmation". If `navigator.clipboard` is unavailable, fall back to selecting a hidden `<textarea>` and `document.execCommand('copy')` — do **not** throw. The button MUST work without any external script, library, or build step. Inline `<script>` only. No `any` if you write any TS in the inline script — but if it's plain inline `<script>` JS, that's fine; it doesn't go through the TS compiler.

3. **Print stylesheet** in the existing inline `<style>` block. Add an `@media print` rule that hides:
   - The `<form>` for "Move to the next prompt" / "Finish" (irrelevant on the complete view, but defensive).
   - The "Copy this conversation" button itself.
   - Any back-to-`/` link.
   - The footer disclaimer? **No — keep the footer disclaimer visible in print.** It must travel with the printed copy so the printed artefact is still on-line about not being advice.
   - Any `<meta http-equiv="refresh">` is irrelevant to print but should not be on the complete view anyway (per existing spec).

   Print rule should also: ensure black text on white background, set a reasonable serif or sans-serif body font, set `body { margin: 1.5cm; }` so the printed page has margins.

4. **Helpful UI copy on the complete view.** Below the recap, add two short lines (above or beside the buttons):
   - "Sessions disappear after 24 hours. If you'd like to keep this conversation, you can copy it to your clipboard or print it." — or equivalent. British English. No advice.
   - The button(s) themselves: a `<button id="copy-recap" type="button">Copy to clipboard</button>` and, optionally, a small "Print this page" hint with `onclick="window.print()"` on a second button or simply a one-line instruction. Your call which.

5. **Tests.** Extend the existing deck-walkthrough test in `apps/product/tests/smoke.spec.ts`:
   - After the session completes, assert the complete view contains:
     - A `<button id="copy-recap">` (or whatever exact id you choose — match it in the test).
     - The string "Copy to clipboard" (or whatever button label you use).
     - The string "print" or "Print" appearing somewhere user-facing on the page (case-insensitive ok).
     - A `<style>` block (the existing one) containing `@media print`.
     - A `<script>` block containing the recap text or `clipboard.writeText`.
   - You do not need to test the *actual* clipboard write (Playwright permissions for clipboard are flaky; not worth the test infra cost). Asserting the button + script presence is sufficient. If you can cheaply assert `window.getSelection`/`navigator.clipboard` is wired with `page.evaluate` against the dev server, do it; if not, skip.

6. **README — `apps/product/README.md`.** Add one line under "How a session works" mentioning that the complete view offers a clipboard copy and a printable layout. One line, not a section.

Constraints:
- Stay inside `apps/product/`. Never edit `apps/blog/` or `coordination/decision-log.md`.
- TypeScript: no `any`, prefer `type`, named exports, curly braces on every conditional. Inline JS in the page is plain JS — keep it simple, terse, no dependencies.
- British English in all UI copy. "Copy to clipboard" is acceptable British English (technical term).
- No new server routes. No schema changes. No new KV writes.
- No external scripts, fonts, libraries. Inline only.
- Do not sign commits. Small commits preferred (recap text helper → button + script → print stylesheet → tests → README).

Definition of done:
- The complete view renders the recap, a working "Copy to clipboard" button, and a print-friendly layout (verify with browser `Ctrl/Cmd+P` preview locally — print stylesheet hides chrome, keeps prompts, answers, footer).
- Updated walkthrough test passes locally and against the deployed URL.
- `pnpm --filter product deploy` succeeds.
- All Playwright tests pass against the deployed URL after deploy.
- An entry has been appended to `coordination/review-queue.md` with the deployed URL, the commit shas, and a one-line summary.
- Status field below set to `awaiting-review`.

Out of scope:
- A `?download` query / server-side text-attachment route (decision-log 2026-05-01 03:30 explicitly defers it).
- Server-side PDF generation (rejected on principle).
- Email-the-summary (rejected on principle).
- Any change to prompts, deck length, or session schema.
- Realtime / WebSockets.
- Custom domain.
- A blog post — that is the Orchestrator's call after PASS.

**Assigned:** 2026-05-01 03:35 UTC — Engineer
**Status:** assigned
**Notes:** Time budget: ~45 minutes. Tight, on-strategy response to the rival check. Do not expand scope.
