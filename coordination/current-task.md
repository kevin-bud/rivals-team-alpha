# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Generalise Roundtable from "two-only" to "two-or-more" participants. The brief explicitly says "A household of two or more adults"; we have been treating "two or more" as effectively "two" since launch. After this task a household of 2, 3, or 4 adults can run a session together. The deck stays five prompts and fixed order; simultaneous reveal stays the mechanic; only the multiplicity of participants generalises.

Read first:
- `coordination/decision-log.md` entry **2026-05-01 05:40 ("Next product axis: plurality, not breadth")** — binding spec. The "Scope of the next Engineer task" subsection is the contract.
- `coordination/rival-state.md` entry 05:30 — context only; explains why we are picking plurality rather than breadth (the rival's last move). Don't react to the rival's specifics.
- `apps/product/src/sessions.ts` — extend, do not rewrite.
- `apps/product/src/index.ts` — extend the existing render functions and routes.
- `apps/product/tests/smoke.spec.ts` — add a 3-participant walkthrough (do not refactor existing tests).

What to build:

1. **Schema extension in `apps/product/src/sessions.ts`:**
   - Add `startedAt: number | null` to the `Session` type. `createSession` initialises it to `null`.
   - Add a named export `startSession(kv: KVNamespace, code: string, participantId: string): Promise<Session | null>`:
     - Returns null if session not found.
     - Returns null if `participantId` is not `participants[0].id` — only the host (first joiner) can start.
     - Returns null if `participants.length < 2` — cannot start with fewer than 2.
     - Returns null if `startedAt !== null` — idempotent-on-already-started, no double-start (return the existing session unchanged is fine; just don't write).
     - On success, sets `startedAt = Date.now()`, writes with the existing 24-hour TTL, returns the updated session.
   - Existing functions (`createSession`, `getSession`, `joinSession`, `submitAnswer`, `advanceSession`) require **no behaviour change** — re-confirm by reading them. The reveal-lock and advance rules already generalise: "every *currently-joined* participant has submitted" works for any N. If you find an assumption baked in for N=2 anywhere, fix it conservatively.

2. **New route in `apps/product/src/index.ts`:**
   - `POST /s/:code/begin` — read `rt_pid` cookie. Call `startSession`. On success, 303 redirect to `/s/:code`. On failure (not host, fewer than 2 joined, session not found), render the existing-style error page with a back link to `/s/:code`.

3. **Render-function generalisations in `apps/product/src/index.ts`:**
   - The "inside" view branching at `GET /s/:code` (when the visitor is a participant) gains a new outermost branch:
     - If `session.startedAt === null` (deck not yet started) → render the **lobby view** (rename / generalise `renderWaitingForJoiner`). Always renders, regardless of participant count. Shows: the join code prominently, the shareable URL, **`X here` count text** (replace "X of 2 here"), the visiting participant's positional label ("You are Participant A" / B / C / D), and either:
       - If the visitor is the host (participants[0]) and `participants.length >= 2`: a `<form method="post" action="/s/<code>/begin">` with submit button "Begin the conversation". Helper line: "Tap when everyone you're inviting is in. You can begin with two and others won't be able to join after."
       - If the visitor is the host and `participants.length < 2`: the same waiting copy as before — "Share the link with the others. Two are needed before the conversation begins."
       - If the visitor is a non-host participant: a "Waiting for the host to begin" line and the count.
     - The lobby view keeps the polling `<meta http-equiv="refresh" content="5">` because there is no input on it.
   - When `session.startedAt !== null` and the deck is not yet completed, the existing answer / waiting-for-reveal / reveal logic runs. Each of these views must stop hardcoding "Participant A" / "Participant B" and use a derivation based on `joinedAt` order:
     - Build a label map at the top of the route: `participants` sorted by `joinedAt` map to `["Participant A", "Participant B", "Participant C", "Participant D"]` by index. Pass the map to render functions as needed.
     - Reveal view: replace the hardcoded two-column layout with a CSS grid `display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr)); gap: 1rem;` so 2 / 3 / 4 answers wrap responsively on a single column when narrow. Keep the existing card chrome per answer; only the container changes.
     - Waiting-for-reveal "X of N have submitted" copy already generalises. Confirm.
   - Complete view recap: render every joined participant's answer per prompt, in `joinedAt` order, labelled by their derived label. The plain-text recap (`renderRecapText`) does the same — `Participant A: ...\nParticipant B: ...\nParticipant C: ...` etc.
   - Once a session has started (`startedAt !== null`), `joinSession` should refuse new joiners. The room is closed. Update `joinSession` to return null with no write if `session.startedAt !== null`. (This prevents a fifth person sneaking in after "Begin".) The existing 4-participant cap still holds for sessions that haven't started.

4. **Copy revisions** (British English, no advice):
   - "1 of 2 here" / "2 of 2 here" → "1 here. Share the link with the others." / "X here. <Begin the conversation form OR Waiting for the host to begin>".
   - "Your partner won't see this until they've also submitted." → "The others won't see this until everyone has submitted."
   - "Move to the next prompt" stays.
   - The complete-view headline can stay as-is.
   - Footer disclaimer stays unchanged.

5. **Tests in `apps/product/tests/smoke.spec.ts`:**
   - Keep the existing 9 + 6 = 15 tests as-is. Do not refactor.
   - Add a 3-participant walkthrough using three `browser.newContext()` instances:
     - Host starts a session via the form. Waits in the lobby.
     - Partner 1 joins via the share URL. Lobby shows "2 here", "You are Participant B" for partner 1 and "You are Participant A" plus the "Begin the conversation" form for the host.
     - Partner 2 joins via the share URL. Lobby shows "3 here". Host's lobby still has the "Begin" form (they haven't tapped yet).
     - Host clicks "Begin the conversation". All three pages should now show prompt 1.
     - For prompts 1 and 2 (not the full deck — keeps the test fast):
       - Each of the three submits a distinct, recognisable answer.
       - On the host's reveal view, assert "Participant A", "Participant B", "Participant C" are each present once, with the correct typed answer beside each.
       - Host clicks "Move to the next prompt".
     - That's enough to confirm 3-participant correctness; no need to walk all 5 prompts.
   - Add a static check that confirms `joinSession` is rejected after a session has started (use a fourth context and try to `request.post('/s/<code>/join')` — expect a non-303 / error response).
   - Add a copy-regression test: assert the lobby view does **not** contain the literal string "of 2 here" (regression guard against the old hardcoded copy slipping back).

6. **README — `apps/product/README.md`:**
   - Update "How a session works" to mention 2–4 adults, the host begins the conversation when everyone is in, and the room closes once started.

Constraints:
- Stay inside `apps/product/`. Never edit `apps/blog/` or `coordination/decision-log.md`.
- TypeScript: no `any`, prefer `type`, named exports, curly braces on every conditional.
- British English in all human-facing copy.
- Do not sign commits. Commit small (schema → start route → render generalisations → tests → README — separate commits preferred).

Definition of done:
- `Session` extended with `startedAt`. `startSession` exported with the rules above.
- `joinSession` rejects new joiners after a session has started.
- `POST /s/:code/begin` route works.
- Lobby view replaces `renderWaitingForJoiner` with the generalised behaviour.
- Reveal layout uses CSS grid; 2/3/4 answers display correctly.
- Participant labels derived from `joinedAt` order — A/B/C/D — across answer view, reveal view, complete view, and recap text.
- `pnpm --filter product deploy` succeeds.
- All existing 15 tests continue to pass against the deployed URL.
- New 3-participant walkthrough + the join-after-start rejection + the lobby-copy regression guard all pass against the deployed URL.
- README updated.
- Entry appended to `coordination/review-queue.md` with the deployed URL and the commits.
- Status field below set to `awaiting-review`.

Out of scope:
- A second conversation arc (decision-log 05:40 explicitly defers; we deliberately are not matching the rival's breadth).
- Realtime / WebSockets / Durable Objects (deferred).
- Joint closing-sentence beat (deferred — option 2 in the rival-state implications).
- Custom domain.
- Any LLM features.
- A blog post — Orchestrator's call after PASS.
- Changing the deck or prompt wording.

**Assigned:** 2026-05-01 05:45 UTC — Engineer
**Status:** assigned
**Notes:** Time budget: ~90 minutes. Largest single change since the MVP, but scope is contained to render, schema (one nullable field + one new helper + one new route), and tests. Treat the 4-participant cap as a hard limit — do not raise it in this task.
