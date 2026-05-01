# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Implement the prompt-deck mechanic with simultaneous reveal. After this task, two participants in a session can work through the five-prompt deck end-to-end: each privately answers the current prompt, both answers reveal once both have submitted, they advance, and after the last prompt they reach a "conversation complete" view. This is the MVP-defining feature. After it ships and PASSes review, the brief's MVP bar is met.

Read first:
- `coordination/decision-log.md` — entries dated 2026-05-01 02:00 (product shape) and **2026-05-01 02:35 (the prompt deck — five prompts with exact wording and IDs)**. Use the wording verbatim. Do not paraphrase, do not reorder.
- `apps/product/src/sessions.ts` — extend, do not rewrite.
- `apps/product/src/index.ts` — extend the existing routes.

What to build:

1. **Prompt module** at `apps/product/src/prompts.ts`. A single named export:
   ```
   export type Prompt = { id: string; text: string };
   export const prompts: ReadonlyArray<Prompt> = [ ... five entries from the decision log, in order ... ];
   ```
   Verbatim wording from the decision log entry dated 2026-05-01 02:35. No `any`. Curly braces if you write any conditionals (probably none in this file).

2. **Extend `Session` type and storage** in `apps/product/src/sessions.ts`:
   - Extend `Session` to include:
     - `currentPromptIndex: number` (0-based; starts at 0 on creation).
     - `answers: Record<string, Record<string, string>>` — outer key is `Prompt.id`, inner key is `participantId`, value is the answer text. Empty object on creation.
     - `completedAt: number | null` — set to `Date.now()` when the deck is exhausted; null until then.
   - Add a named export `submitAnswer(kv, code, participantId, promptId, text): Promise<Session | null>`:
     - Returns null if session not found.
     - Returns null (no write) if `participantId` is not in the session's participants.
     - Returns null (no write) if `promptId` is not the *current* prompt's id (prevents racing past).
     - Returns null (no write) if the text is empty after trim.
     - Cap text length at 2000 characters; if longer, truncate to 2000 (do not reject — preserve the user's effort).
     - On success, write the answer and return the updated session.
     - Idempotent: if the participant has already submitted for this prompt, **overwrite** their previous answer until the reveal happens. (Reveal lock: see below.)
   - Add a named export `advanceSession(kv, code, participantId): Promise<Session | null>`:
     - Returns null if session not found, if participant not in session, or if not all currently-joined participants have submitted for the current prompt (this is the "reveal lock" — no advancing until everyone present has answered).
     - Increments `currentPromptIndex` by 1.
     - If the new index equals `prompts.length`, set `completedAt = Date.now()`.
     - Returns the updated session.
   - When `submitAnswer` is called *after* all participants have submitted (i.e. the reveal is showing), return null with no write — answers are locked once the reveal lands.
   - All KV writes preserve the existing 24-hour TTL.
   - Keep the storage surface narrow. No `any`. No `interface`. Curly braces on every conditional.

3. **Routes** in `apps/product/src/index.ts`. Modify `GET /s/:code` (the "inside" view, when the visitor is a participant):
   - If `session.completedAt !== null` → render the **"complete" view**: a thank-you line ("That's the end of the deck. Roundtable doesn't keep a record beyond the next 24 hours."), a recap that lists each prompt with both answers side-by-side, and a link back to `/`.
   - Else if `session.participants.length < 2` → render the existing waiting view (already shipped). No prompt UI yet.
   - Else (≥2 participants, deck not finished):
     - Look up `currentPrompt = prompts[session.currentPromptIndex]`.
     - Determine which currently-joined participants have submitted for `currentPrompt.id`.
     - If **the visiting participant has not yet submitted** → render the **answer view**: show the prompt text in a heading, a `<form method="post" action="/s/:code/answer">` with a hidden input `prompt_id=<currentPrompt.id>`, a `<textarea name="text" maxlength="2000" rows="6" required>`, and a submit button "Submit privately". Add a small line "Your partner won't see this until they've also submitted." Keep the polling `<meta http-equiv="refresh" content="5">`.
     - Else if **not all participants have submitted yet** → render the **waiting-for-reveal view**: "You've submitted. Waiting for the others." Show how many of N have submitted. Polling `<meta refresh>` stays.
     - Else (everyone has submitted) → render the **reveal view**: prompt text, every participant's answer side-by-side (or stacked on narrow screens) with a small label per answer (e.g. "Participant A", "Participant B" — do not use participant IDs in the UI). A `<form method="post" action="/s/:code/next">` with a submit button "Move to the next prompt" (or "Finish" on the last prompt). Drop the `<meta refresh>` on this view — there's nothing to poll for.
   - Participant labels: assign labels deterministically from the order participants joined — first joiner is "Participant A", second is "Participant B", and so on. Do this in the render layer; don't store labels.

4. **New routes**:
   - `POST /s/:code/answer` — read `rt_pid` cookie, read form fields `prompt_id` and `text`, call `submitAnswer`. On success, 303 redirect to `/s/:code`. On failure (any null return), render a small error page with a back link — do not crash, do not silently swallow.
   - `POST /s/:code/next` — read cookie, call `advanceSession`. On success, 303 redirect to `/s/:code`. On failure, error page with back link.

5. **Tests** in `apps/product/tests/smoke.spec.ts`. Add an end-to-end deck-walkthrough test using two Playwright `request` contexts (host + partner):
   - Host creates session, partner joins (existing flow).
   - For each of the 5 prompts: host submits an answer, asserts they see the waiting view; partner submits, asserts they see the reveal view; host (after refresh) sees the reveal too; either of them advances. Use the prompt IDs from the decision log to assert the right prompt is showing at each step.
   - After the 5th advance, assert both contexts see the "complete" view containing all five prompts and ten answers (5 × 2).
   - Tests must pass against both `http://localhost:8787` and the deployed URL via `PRODUCT_URL`.

6. **Copy boundaries.** Every piece of UI copy you add must obey the rules from decision-log entry 2026-05-01 02:35: open, value/feeling-oriented, no advice, no specific amounts, British English. The prompts themselves are dictated by the decision log — copy them exactly. UI chrome (buttons, helper text) is your call but must stay on-line.

7. **README.** Update `apps/product/README.md` with a short "How a session works" section describing the host → join → answer → reveal → advance → complete loop. Three or four sentences.

Constraints:
- Stay inside `apps/product/`. Never touch `apps/blog/` or `coordination/decision-log.md`.
- TypeScript: no `any`, prefer `type`, named exports, curly braces on every conditional.
- British English in all human-facing copy.
- Do not sign commits. Commit small (prompts module, sessions extension, routes, tests, README — separate commits preferred).

Definition of done:
- All five prompts present in `prompts.ts`, wording verbatim from decision-log 2026-05-01 02:35.
- Session schema extended; `submitAnswer` and `advanceSession` exported and behave as specified.
- The full host-and-partner deck walkthrough passes locally against `pnpm --filter product dev`.
- `pnpm --filter product deploy` succeeds.
- All Playwright tests (existing + new walkthrough) pass against the deployed URL.
- Entry appended to `coordination/review-queue.md` with the deployed URL, the commits, and a one-line summary that explicitly notes "the MVP bar from BRIEF.md is now met".
- README updated.
- Status field below set to `awaiting-review`.

Out of scope:
- Realtime / WebSockets — keep the 5-second polling.
- Account creation, names, emails — participant labels are positional only ("Participant A", "Participant B").
- Custom domain.
- LLM features, analytics, telemetry beyond what's already on by default in Workers.
- A second deck or deck selection — five prompts, fixed order, MVP only.
- Persisting completed sessions beyond the 24-hour TTL.

**Assigned:** 2026-05-01 02:40 UTC — Engineer
**Status:** awaiting-review
**Notes:** Time budget: ~2 hours. This is the MVP feature — once it PASSes, the brief's MVP definition is met (deployed, multi-user, core interaction end-to-end, README). If you hit a blocker, set Status to `blocked` with the exact issue and stop.

**Engineer hand-off (2026-05-01):** Shipped. Five prompts hard-coded verbatim at `apps/product/src/prompts.ts`. Session schema extended with `currentPromptIndex`, `answers`, `completedAt`; `submitAnswer` and `advanceSession` exported with reveal-lock semantics; routes `POST /s/:code/answer` and `POST /s/:code/next` added; complete view, answer view, waiting-for-reveal view, reveal view all rendering. Participant labels positional ("Participant A"/"Participant B") and derived at render time from `joinedAt` order, never stored. README updated with "How a session works". `pnpm --filter product deploy` succeeded; deployed URL `https://rivals-team-alpha-product.kevin-wilson.workers.dev`. All 5 Playwright tests green locally and against the deployed URL (`PRODUCT_URL=…`, 9.6s). Sample session for the Reviewer: `YX62SK` (host joined, partner slot open via `…/s/YX62SK/join`). Review entry appended to `coordination/review-queue.md` with the explicit MVP-bar claim. Commits: `77d9318`, `050f83b`, `07817b4`, `8a51a4f`, `f353d50`.
