# Decision log

Append-only record of decisions made by the Orchestrator. Each entry follows
the format below. Never edit past entries. If a decision is reversed, write a
new entry that references the previous one.

---

## YYYY-MM-DD HH:MM — [Decision title]

**Context:** What situation prompted this decision.
**Options considered:** What alternatives were on the table.
**Choice:** What was decided.
**Rationale:** Why this over the alternatives.
**Reversible?** Yes / No / Costly to reverse.

---

## 2026-05-01 01:38 — Initial reading of the brief

**Context:** T+0 kickoff. Need to anchor the team on a shared reading of `BRIEF.md` before any work starts.

**What the brief asks for, in my own words:** A publicly-deployed web app that helps a household of two-or-more adults have a more deliberate joint conversation about their shared finances. It is explicitly not a budgeting app, not an accounting tool, not an advisor. The product itself is the *conversation* — what topics get surfaced, in what order, how disagreement is handled, how alignment is captured. The brief leaves the shape of that conversation (synchronous vs asynchronous, structured vs open-ended, opinionated vs neutral, playful vs serious) to us. Evaluation is comparative and process-focused: what bets we made, how decisions evolved, how we handled the regulated-advice line, what the trail shows.

**First concrete goal toward shipping:** Get a real landing page live at the deployed URL that names the product, states its premise in one paragraph, and has a single primary call-to-action ("Start a session") that is wired but stubbed. This grounds every later decision against something concrete and forces the product's identity to exist before we argue about persistence or auth. MVP-relevant because the deployed URL must already exist and be publicly accessible — replacing "coming soon" with a real surface is the smallest non-trivial step toward MVP.

**Constraints that jumped out:**
- "Not regulated advice" is a failure condition, not a soft preference. Copy and any prompts must avoid recommending what someone *should* do with their money. Tone leans toward facilitation, not prescription.
- "Multi-user by nature" rules out a single-person dashboard pattern. Whatever we build must reflect two-or-more people from the first interaction.
- "Privacy-respecting" + sensitive data — pushes us toward storing as little as possible, ephemeral sessions over persistent accounts, and being explicit in copy about what is stored.
- Public blog posts are evaluation evidence, and the rival can read them. We should still write candidly — the evaluation rewards a visible decision trail more than it rewards strategic ambiguity.
- One-sitting-or-recurring framing implies *sessions* as the central object. That's a useful hint without being a decision yet.

**Choice:** Adopt the reading above as the team's working interpretation of the brief. Frame the product as a *guided household money conversation* whose central object is a session, not a user. Defer all stack decisions (framework, persistence, auth) until the landing page lands and the product premise is explicit in code.

**Rationale:** Anchoring on the conversation-as-product framing keeps us from drifting into budgeting-tool territory, which the brief explicitly excludes. Centring "session" over "user" front-loads the multi-user constraint. Deferring stack picks avoids over-committing before we have a real surface to point at.

**Reversible?** Yes — this is an interpretation, not architecture. We can revise it the moment evidence (rival reading, user feedback, our own work) suggests a better frame.

---

## 2026-05-01 01:55 — Ratify product name "Roundtable"

**Context:** First task asked the Engineer to choose a product name and record it in the commit message; ratification or revision is the Orchestrator's call. Engineer chose "Roundtable" (commit `20eb017`); Reviewer PASS confirmed it is live on the deployed URL.

**Options considered:** Keep "Roundtable"; rename to something more finance-flavoured (e.g. "Ledgerline", "Joint"); rename to something softer ("Kitchen Table", "Two Cups").

**Choice:** Keep "Roundtable" as the product name.

**Rationale:** The name is short, conversation-flavoured, multi-party by implication, and free of finance jargon — which is exactly what the brief framing pushes toward (a tool for the conversation, not a tool for the money). It also avoids any wording that could be read as suggesting financial expertise or advice, which protects the regulated-advice line. Renaming now would cost commits and copy churn for negligible benefit.

**Reversible?** Costly to reverse once we have any external traffic or blog posts referencing the name. Cheap right now. We will treat the name as fixed unless evidence (rival overlap, trademark concern, user confusion) emerges.

---

## 2026-05-01 02:00 — Adopt product shape: deck-of-prompts with simultaneous reveal

**Context:** With the landing page live, the next decision is what "the conversation" actually looks like as a product. The brief explicitly leaves this open and flags it as primary evaluation evidence.

**Options considered:**
- **(a) Open-ended shared whiteboard** — both partners type freely into a shared document with light prompts in the margin. High flexibility, but the brief warns against single-user-dashboard patterns and a whiteboard easily becomes one person typing while the other watches. Also weak on privacy because everything is visible to both at all times, removing the chance for honest first-thoughts.
- **(b) Structured synchronous "deck of prompts" with simultaneous reveal** — the app presents one prompt at a time. Each person answers privately on their own device. Once both have submitted, both answers are revealed at once. They discuss, then advance to the next prompt. Inspired by relationship-card-deck formats (e.g. "The And", *36 Questions*) repurposed for money topics.
- **(c) Asynchronous Q&A queue** — one partner posts a question, the other answers later, repeat. Low coordination cost but fails the "in a single sitting" framing in the brief and weakens the multi-user-at-once feel.
- **(d) Open chat with a facilitator persona (LLM)** — an AI plays "facilitator" and steers the discussion. Powerful, but pushes hard on the regulated-advice line (an LLM facilitator that responds to specific financial situations risks crossing it) and shifts the product's identity from "conversation tool" to "AI advisor", which the brief excludes.

**Choice:** Option (b) — structured synchronous deck-of-prompts with simultaneous reveal. The product asks pre-authored prompts (written by us, generic, not advice). Each partner answers privately. Both answers reveal together. Discussion happens off-screen between humans. The app advances when both tap "next".

**Rationale:**
- *Honest about what makes a money conversation hard:* the friction is people not knowing what the other thinks until they say it. Simultaneous reveal removes the social cost of going first.
- *Multi-user by nature, not by accident.* Two devices, two private inputs, one shared screen state per prompt — the multi-user constraint is structural, not decorative.
- *Stays the right side of the regulated-advice line.* We author neutral prompts ("How do you feel about how we're currently splitting bills?", "What does 'enough' look like to you in three years?"). We do not generate, recommend or interpret answers. The product is a structure for *their* conversation, not advice on *their* situation.
- *Privacy-respecting by design.* Sessions are ephemeral, answers belong to the participants, and we never need to ask for actual financial figures unless a prompt invites them.
- *Concrete enough to ship.* It maps cleanly onto a small set of HTML routes and a key-value session store. No realtime infra strictly required for MVP — short polling is fine.

**Reversible?** Reversible in shape (we can swap deck contents, add async modes later) but the synchronous-two-device-simultaneous-reveal mechanic is the product's identity. Changing that is a re-pivot, not an iteration.

---

## 2026-05-01 02:05 — Persistence: Cloudflare KV for sessions, ephemeral by default

**Context:** The deck-of-prompts shape requires session state shared across two devices: a session record, two participant slots, the current prompt index, and per-participant answers per prompt. We need to pick a Cloudflare-native store before the next task.

**Options considered:**
- **KV** — simple key-value, eventually consistent, one-region writes globally read. Ample for low-write-rate session state. Read latency is low. TTL built-in (good for ephemerality).
- **D1** — SQLite-on-Workers. Stronger consistency and queries, but adds schema/migration overhead and is overkill for session-shaped data we will throw away.
- **Durable Objects** — strongly consistent per-session actor, ideal for realtime coordination between two devices. Best technical fit but adds binding/setup cost and we do not need realtime for MVP (polling on the reveal step is acceptable).
- **R2 / no persistence** — R2 is the wrong shape; no persistence makes the second device unable to join, which kills multi-user.

**Choice:** **KV** for MVP, with TTL on every key (default 24 hours). Session keyed by a 6-character join code. Answers stored under `session:<code>` as a JSON blob.

**Rationale:** KV is the lowest-friction store that satisfies the multi-user requirement, gives us TTL-based privacy out of the box (data deletes itself), and avoids the schema overhead of D1 for state that is intentionally ephemeral. KV's eventual consistency is acceptable for the deck-of-prompts pattern: a partner refreshing twice to see the other's submission is fine; we do not need sub-second realtime for MVP. If realtime becomes load-bearing, we migrate the *active session* into a Durable Object behind the same routes — Engineer should keep the storage interface narrow enough that this swap is mechanical.

**Reversible?** Yes, but with migration cost — any in-flight sessions at the time of swap would be discarded (acceptable given TTL). Storage interface should be wrapped so the swap touches one module.

---

## 2026-05-01 02:35 — MVP prompt deck: five open prompts, authored by us, hard-coded

**Context:** Session join handshake shipped and PASSed. The next step is the core mechanic — a prompt, two private answers, simultaneous reveal, advance. The prompts themselves are identity-defining content and on the regulated-advice line, so the wording is an Orchestrator decision, not an Engineer one.

**Options considered:**
- **(a) LLM-generated prompts at runtime.** Maximum variety per session. Rejected: an LLM generating money prompts at runtime is one error-handling bug away from generating *advice* in the prompt itself, which is the failure condition. Also adds an API dependency for MVP.
- **(b) Source from a published card deck (e.g. *36 Questions*–style adaptations).** Saves authoring effort but introduces licensing/attribution overhead and weakens the team's decision trail (we want the brief's evaluators to see *our* choices, not someone else's).
- **(c) Author a small fixed deck ourselves, hard-coded as a TypeScript array.** Five prompts for MVP. We control every word. Easy to extend later. No runtime cost.
- **Length: 3 vs 5 vs 10 prompts.** Three feels too short for a "session". Ten risks fatigue in a first sitting. Five is roughly twenty minutes of conversation at a relaxed pace, which matches "a single sitting" in the brief.

**Choice:** Option (c). Five prompts, hard-coded in `apps/product/src/prompts.ts` as a named export `prompts: ReadonlyArray<{ id: string; text: string }>`. Exact wording, in order:

1. **`values-enough`** — "What does 'enough' mean to each of us, in three years' time?"
2. **`history-belief`** — "What's something about money you grew up believing that you've since changed your mind about — or are starting to?"
3. **`recent-decision`** — "Think of a money decision we (or you) made in the last year. What feels good about it now? What feels less good?"
4. **`shared-costs`** — "When it comes to how we split or share costs at the moment, what feels fair to you, and what doesn't?"
5. **`unexpected`** — "If something unexpected happened that felt financially significant — whatever 'significant' means to us — what's the first thing each of us would worry about?"

**Rules the prompts obey (so future additions stay on-line):**
- Open-ended. No yes/no, no multiple-choice.
- Ask about *feelings, values, perspectives, or lived experience* — never about what someone *should* do.
- No specific monetary amounts, percentages, products, or tax/legal/investment terminology.
- Phrased as a shared "we" or symmetrical "each of us" where natural — never as a question one partner asks the other.
- British English.

**Rationale:** Hard-coding gives us total control over the regulated-advice line, which is the fastest way to be confident every prompt is safe. Five prompts is enough to feel like a session without overstaying the first sitting. The five chosen span values, history, recent behaviour, present arrangements, and hypothetical stress — a deliberate range so the conversation does not collapse to one topic. The IDs (not just indices) are deliberate so a future "skip" or "shuffle" feature does not break stored answers.

**Reversible?** Fully reversible — wording can be revised, prompts added or replaced. The shape (ordered array of `{ id, text }`) is the load-bearing contract; revising copy is a one-commit change. If we add a "shuffle" or "user-selectable deck" feature later, the IDs survive.

---

## 2026-05-01 03:30 — Take-away affordance: clipboard copy + print stylesheet, no new storage

**Context:** First post-MVP rival check (rival-state entry 2026-05-01 03:15) shows the rival's product, "Common Ground", offers a "shared summary you can save as a PDF" at the end of a session. Our complete view already renders the full recap (5 prompts × 2 answers) in-browser, but we offer no affordance for participants to keep it. This is the only material product-experience gap the rival check exposed and worth closing on our terms before any other feature work.

**Options considered:**
- **(a) Server-side PDF generation.** Match the rival like-for-like. Rejected: requires storing the rendered output even briefly (or running a PDF library in a Worker), which complicates the privacy story. We chose ephemerality and no-accounts; introducing PDF generation pulls against both.
- **(b) Email-the-summary-to-yourself.** Rejected outright: the footer says "we do not collect accounts, names, or emails", and breaking that for a take-away feature would be the kind of own-goal the brief explicitly evaluates badly.
- **(c) "Copy this conversation" clipboard button on the complete view.** Tiny client-side JS, copies a plain-text version of the recap (prompt + Participant A's answer + Participant B's answer, repeated for each prompt). Zero new storage, zero new dependencies. Works on every modern browser via `navigator.clipboard.writeText`.
- **(d) Print-friendly stylesheet (`@media print`).** Hide the chrome (refresh meta, "advance" form, etc.) so the participant can browser-print the complete view to PDF *on their own device*. This is the rival's PDF feature implemented as user-agent capability rather than as a server feature — same outcome, our privacy posture intact.
- **(e) `?download` query that returns recap as a `text/plain` attachment.** Functionally redundant with (c) once (c) exists; nicer for users without clipboard JS but adds a route surface for very little extra utility. Defer.

**Choice:** Ship (c) and (d) together as the next Engineer task. Defer (e); revisit only if we see evidence users want it. (a) and (b) are off the table on principle, not on cost.

**Rationale:**
- Closes the take-away gap with zero compromise to the ephemeral-by-default privacy story. Both (c) and (d) operate on data already rendered in the user's browser; nothing new is stored, sent, or generated server-side.
- The combined effort is small (a button + a small `<script>` + a `@media print` block) and isolated to the complete view's render path — no schema changes, no new routes, no test infrastructure changes.
- Differentiates *intentionally* from the rival: their take-away is a server-rendered PDF, ours is "your browser already has everything; here are two buttons to keep it on your own device." That difference is itself a design statement consistent with our privacy framing.
- Holds the line on the "no accounts, no emails, no PII off-device after 24 hours" promise. The rival check tempted us toward expanding scope; we are responding *narrowly*.

**Reversible?** Yes, trivially. Removing either feature is a single commit and breaks no contract.

---

## 2026-05-01 03:55 — P0 hotfix: GET /s/:code/join is unrouted, breaks every shared join link

**Context:** External feedback received via the operator: the deployed app does not work — visiting any session's join URL (e.g. `/s/<code>/join`) returns the "Session not found" 404 page. Reproduced from the deployed Worker:
- `POST /sessions` → 303 with `Location: /s/<code>` ✅
- `GET /s/<code>` (no cookie, partner first visit) → 200, renders the join view ✅
- `GET /s/<code>/join` → **404** ❌

Root cause: `apps/product/src/index.ts` only handles `POST /s/:code/join`. The `GET` is unrouted and falls through to the 404. But the host page renders `${origin}/s/<code>/join` as a clickable `<a href>` link (lines 432 and 448) — this is the URL we *tell users to share*. Every click on that link, every paste of that URL into a browser address bar, every text-message tap, hits the broken GET path. Two-device sessions are therefore impossible for any real user, despite a green Reviewer PASS on the take-away affordance and on the original join-handshake task.

The Playwright suite missed this because every test calls `request.post('/s/<code>/join')` directly via the request context, never doing a `page.goto('/s/<code>/join')` to mimic a real user clicking the share link. Test gap, not test failure.

**This is a P0 product-broken bug. The next task is the hotfix, ahead of any other planned work.**

**Options considered for the fix:**
- **(a) Add a `GET /s/:code/join` handler that 303-redirects to `/s/:code`.** Cleanest. Single canonical join surface (`/s/:code`) — the `/join` URL becomes a deep-link alias that funnels the joiner to the same page non-participants already get. Two lines of code.
- **(b) Add a `GET /s/:code/join` handler that renders the join view directly.** Equivalent UX but duplicates the render path. Risks the two views drifting later.
- **(c) Change the share URL we display from `/s/:code/join` to `/s/:code`.** The simplest fix on the surface, but breaks every link the host has *already* shared (text messages, copy-pasted URLs). We have no way to know how many real sessions are mid-flight; the safe move is to keep the URL working.
- **(d) Stop relying on KV / move to Durable Objects.** Tempting but unrelated to this bug — KV consistency is fine; this is a routing oversight. Rejecting as out-of-scope for the hotfix.

**Choice:** **Option (a)**. Add a `GET /s/:code/join` route that 303-redirects to `/s/:code`. Add a Playwright test that uses a real browser context (`page.goto`) — not just `request.post` — to walk a partner through clicking the share link and joining the session. The test gap is part of the fix; without it we will trip the same wire next time.

**Rationale:**
- The user-facing share URL keeps working — no broken links in the wild.
- One canonical join surface — the join view at `/s/:code` is unchanged, so all the existing copy-and-form logic stays as-is.
- The test gap (post-only, never browser-clicks) is closed at the same time, which is the actual root cause we want to prevent next time. A hotfix that only fixes the routing without fixing the test would leave the project a single regression away from the same outage.

**Reversible?** Yes — removing the GET handler is one line. The added test is straightforward to delete.

**Protocol deviation noted:** the take-away affordance task PASSed review at 03:50 but no blog post has been queued and no further rival check has been run, both of which the post-PASS protocol nominally requires before assigning the next task. Deferring both until after the hotfix ships:
- Queueing a post about a take-away affordance whose underlying flow is broken would be misleading; the post can be drafted once the product actually works.
- A second rival check 40 minutes after the first will not surface anything new and burns time we owe to the bug.
The trail will look like: PASS (take-away) → bug report → hotfix decided → hotfix shipped → PASS (hotfix) → queue post(s) for both PASSes → check rival → next decision.

---

## 2026-05-01 04:20 — Second P0: meta refresh on the answer view destroys user input

**Context:** External operator feedback received during the second rival check: "When a session starts and the user is presented with the text box, any text types in it clears every few seconds. Looking at the network tab, it's possible that there's a whole-page refresh." That is exactly what is happening. `apps/product/src/index.ts` has `<meta http-equiv="refresh" content="5">` on three views, including line 472 — the `renderAnswerView` that contains the `<textarea>` for the user's private answer. Every five seconds the browser navigates to itself, the form is rebuilt from scratch, and anything the user has typed is gone. Real users cannot complete a prompt unless they type and submit in under five seconds — and most won't.

This is the second P0 in roughly thirty minutes. The pattern is now legible: our Playwright suite uses `request.post(...)` to submit answers, so it never *sits* on the answer view long enough to experience the refresh. Browser-context coverage was added for the share-link bug; it now needs to be added for the answer view too.

**Root cause:** Polling-via-`<meta refresh>` is indiscriminate. It is correct on the two views that have no user input (`renderWaitingForJoiner` line 439, `renderWaitingForRevealView` line 507) — those views need to detect partner-state changes, the user has nothing to lose. It is wrong on `renderAnswerView` (line 472) because (a) the user has an open textarea whose contents must persist, and (b) any state change polling could surface on this view (partner submits / partner advances) is not actionable until the current user submits their own answer first. Polling on the answer view provides no user value and active harm.

**Options considered:**
- **(a) Remove the `<meta refresh>` from `renderAnswerView` only.** One-line change. Two views still poll where polling is correct (and harmless). Costs us nothing — the answer view does not need to update on its own; the user updates it by submitting.
- **(b) Replace `<meta refresh>` everywhere with JS-based polling that re-renders only on change.** Architecturally cleaner but requires a JSON state endpoint and client-side script that is well outside the time budget for a hotfix. Defer.
- **(c) Persist textarea content to `localStorage` on input and restore on load, keeping the refresh.** Works around the symptom rather than fixing the cause. The page navigation is still happening, scroll position is lost, focus is lost, the form state machinery is being rebuilt — and we'd be writing user-private answer text to localStorage, which contradicts the stated privacy framing ("answers stay in this session" implies session-scoped, not browser-history-scoped). Reject.
- **(d) Migrate to Durable Objects + WebSockets.** Right long-term answer for cross-device updates but enormous scope versus a one-line bug. Reject for the hotfix.

**Choice:** Option (a). Remove the `<meta http-equiv="refresh">` line from `renderAnswerView` (line 472). Leave it on the other two views (`renderWaitingForJoiner` and `renderWaitingForRevealView`) untouched — they need the polling and have no input to destroy.

**Test additions (mandatory in this same task — same lesson as the previous hotfix):**
- A static assertion that the answer view's HTML does **not** contain `http-equiv="refresh"`. One-line regression guard. Cheap and definitive.
- A real browser-context test that loads the answer view, types into the textarea, waits at least 6 seconds (longer than the old 5-second refresh), and asserts the typed text is still in the textarea. Covers the bug as a user experiences it.

**Rationale:**
- Smallest possible change that resolves the user-reported behaviour. One line removed.
- Preserves polling where polling is correct (the two waiting views). Does not touch any other view.
- Closes the test gap that allowed both this and the previous P0 to ship: our tests are now picking up browser-context coverage on the surfaces that actually matter to real users.
- Keeps the Durable Objects question open for a deliberate decision later, not as a panic fix.

**Reversible?** Yes — re-adding the meta tag is one line. The new tests are additive.

**Note on protocol:** Two PASSes (take-away at 03:50, P0 routing hotfix at 04:10) already have posts queued in `coordination/blog-queue.md`; the second rival check (04:15) is logged. The Writer has not yet been dispatched. Per the natural sequence, the Writer should drain the queue *after* this second hotfix lands — bundling the take-away post, the routing-hotfix post, and the answer-view-refresh-hotfix post into a single update is now the obvious move; together they tell one coherent process story (we shipped a feature → we shipped a bug → we fixed it → we shipped another bug → we fixed it again, and here is what each one cost us and what we changed in the suite). Will queue the third post once this hotfix PASSes; the Writer's combine-or-split judgement still applies.

---

## 2026-05-01 04:50 — Test-coverage sweep before more feature work

**Context:** Two P0 bugs in 30 minutes today (`GET /s/:code/join` 404, `<meta refresh>` clearing the answer-view textarea) shipped despite a green Reviewer PASS chain. Both had the same root cause in the *test* code, not the product code: every test wrote `request.post(...)` directly against our handlers, which exercised our routing and KV logic but bypassed the page-as-page experience real users have. Each hotfix added a single browser-context test for the specific surface that broke. That patches the two surfaces but leaves the structural gap.

The remaining user-facing surfaces with no browser-context coverage (auditable from `apps/product/src/index.ts`):
1. The landing page → "Start a session" form submission *as a user clicks it* (not as a `request.post('/sessions')` call).
2. The waiting-for-joiner view: does the meta-refresh actually surface the partner's join, or does the page just redraw the same "1 of 2"? (KV consistency could conceivably matter here.)
3. The waiting-for-reveal view: does the meta-refresh surface the partner's submission and transition the page to the reveal view?
4. The reveal view: do both answers actually render, with the right Participant A/B labels in the right order?
5. The complete view's clipboard button: does the inline JS actually attach the click handler, and does the click actually populate the clipboard? (Test gap is real even though the previous Reviewer PASS confirmed the static markup.)
6. Error paths: "session not found" (we tested this with `request.get` but not via a user navigating to a stale URL), "session full" (untested in any context).

Doing this sweep now, before any further feature work, is on-strategy: it pays down the debt that caused two outages today while the lesson is fresh, and it gives the team confidence to ship the next product decision without flinching.

**Options considered:**
- **(a) Backfill browser-context tests for every remaining user-facing surface in one focused task.** ~5 new `test()` blocks using `page` and `browser.newContext()`. Each one walks a real user through a path and asserts the visible outcome. No production code changes; pure test additions.
- **(b) Pick only the highest-risk surfaces (the meta-refresh polling on the two waiting views, and the clipboard click handler).** Smaller task, leaves three surfaces uncovered. Good if time-constrained; we are not.
- **(c) Defer the sweep, prioritise a new product feature.** Ships more visibly, but we just demonstrated twice today what shipping into untested territory costs us.
- **(d) Replace meta-refresh polling with proper realtime (WebSockets / DOs) and rebuild tests around that.** Reactive scope creep — the bug today was a refresh tag in the wrong place, not a polling-architecture issue. Defer realtime as a separate decision when there's product evidence we need it.

**Choice:** Option (a). Engineer task: add browser-context tests covering the remaining six surfaces above. No production code changes — if a test fails, the failing surface gets a separate hotfix decision before any new test is written for that area. This is *strictly* a test-debt task.

**Rationale:**
- Closes the structural gap that bit us twice today rather than only patching the specific surfaces that broke.
- Cheap insurance: the tests themselves take ~30 minutes to write; each one will either pass (good — we now know that surface works under real-browser conditions) or fail (great — we found the third bug before a user did).
- Pure additive scope. No production code change. No risk of regression.
- Sets up the next feature task with real coverage in place, so a regression in any of the existing surfaces will be caught at PR time.

**Reversible?** Trivially. Tests can be deleted. None of them touch production code. The only reason we would remove them is if they became flaky — and even then, the right move is to fix the flake, not delete the test.

---

## 2026-05-01 05:40 — Next product axis: plurality, not breadth

**Context:** The rival just shipped a second conversation arc (`?arc=open` and `?arc=purchase`) — see rival-state entry 05:30. They have picked breadth (more decks for more occasions) as their next product axis. We need to pick our next product axis. The candidate set from the rival-state implications field:

- (1) **Match breadth**: add a second arc to Roundtable.
- (2) **Depth**: add an end-of-deck joint sentence ("what we've each taken from this") for a shared closing beat.
- (3) **Resilience**: replace meta-refresh polling with Durable Objects + WebSockets.
- (4) **Plurality**: support 3+ participants gracefully — currently the count copy lies past 2 ("3 of 2 here"), the reveal layout assumes a pair, and the participant labels stop at A/B in our prose even though the cap allows 4.

**Choice: Option (4), Plurality.**

**Rationale:**
- *Distinctive from the rival.* They are locked into a "two people, one device, side by side" framing in their landing copy. Picking plurality stakes out an axis they cannot easily follow without re-architecting their UI premise. The brief's evaluation question "where did you and the rival diverge, and what does that suggest" gets a sharper answer.
- *On-brief.* `BRIEF.md` says "A household of two or more adults". We have been treating "two or more" as effectively "two" — a household of three (e.g. two parents and an adult child sharing a roof and some finances; an adult sibling; a co-living arrangement) is explicitly in scope. Generalising to ≥2 honours the brief, doesn't broaden it.
- *Closes a known correctness bug.* The Reviewer flagged "3 of 2 here" as an existing copy issue back in the original session-handshake review. We've been carrying it as a future-copy item ever since. Doing plurality now retires the issue at the same time as expressing the axis.
- *Modest scope, contained surfaces.* The session schema already allows up to 4 participants (set in the original `joinSession` cap). The work is in *render*, not *storage*: count copy, participant labels, reveal layout, recap text, "all here" / "all submitted" predicates. No new routes. No schema change.
- *Identity-preserving.* The deck stays five prompts, fixed order. Simultaneous reveal stays the mechanic. We are deepening *who can be in a session*, not changing what a session is.

**What we considered and rejected, briefly:**
- *Match breadth (option 1).* Tracking the rival's last move within the hour is the wrong shape for a process-evaluated brief. We would look derivative. The brief actively rewards a divergent decision trail.
- *Depth — joint closing sentence (option 2).* Strong on identity but mechanically more invasive than plurality (introduces a post-deck pre-complete state) and would obscure rather than retire the known plurality copy bug. Defer; it remains an attractive future move.
- *Resilience — WebSockets/DOs (option 3).* The 5-second polling delay is a real but small degradation. We just spent the previous slot on test debt; spending the next on infra debt has diminishing returns and no visible product story for the brief's evaluators. Defer until product evidence (a real user complaint about polling lag) makes it priority.

**Scope of the next Engineer task:**
- Generalise the participant count copy on the waiting-for-joiner view from "1 of 2 here" / "X of 2 here" to "X here so far. Two are needed before the conversation begins." (or equivalent). The "everyone has joined and we're ready" beat is "X here. Tap below when everyone is in." with an explicit "Begin the conversation" CTA that the host clicks once they confirm everyone present is in. Reason: with ≥2 the system can no longer auto-start the moment two are joined — three or four people may still be arriving.
- New state: the session needs a `startedAt: number | null` field. `createSession` initialises it to null. A new `startSession(kv, code, participantId)` exported helper sets it to `Date.now()` when the host (the first joiner — `participants[0]`) clicks "Begin the conversation". Until then, the inside view is the waiting view for everyone, regardless of count.
- New route: `POST /s/:code/begin` — only the host (participants[0]) can call it. Returns null if non-host caller, redirects to `/s/<code>` otherwise.
- Generalise participant labels. Render `Participant A` … `Participant D` based on `joinedAt` order, not "Participant A / B" hardcoded. Reveal layout uses CSS grid with `auto-fit, minmax(min(100%, 18rem), 1fr)` so 2/3/4 answers wrap gracefully on narrow screens without rewriting markup per count.
- Generalise reveal-lock and `advanceSession`. The current rule "advance only when *every currently-joined participant* has submitted" already generalises; we just need to confirm tests still hold with 3 participants.
- Generalise recap text. `Participant X: <answer>` lines for as many participants as joined, in joinedAt order.
- Update tests: add a 3-participant walkthrough that joins three browser contexts, hosts begins, walks two prompts (not the full deck — keeps the test fast), confirms reveal shows three labelled answers, recap contains all three for each prompt. Keep the existing 2-participant tests as-is.
- Footer/disclaimer copy unchanged.

**Reversible?** Mostly yes. Reverting would mean re-hardcoding the "of 2" copy, removing the host-begins CTA (or auto-starting at 2), and dropping `startedAt`. None of those would break sessions in flight if we kept the field nullable.

---

## 2026-05-01 06:15 — Regulated-advice copy audit, with a test that locks in the rules

**Context:** The brief lists four evaluation axes: product bets, decision evolution, divergence from the rival, and *how we handled the regulated-advice line*. We have produced strong evidence on the first three (this log; the rival-state file; four published posts). On the fourth, our evidence is implicit — every prompt we wrote, every piece of UI copy, every disclaimer was held to the rule "neutral, value/feeling-oriented, no advice, no specific amounts, British English" (decision-log 2026-05-01 02:35). But we have never produced a single artefact that *demonstrates* the discipline as a deliberate practice rather than as a pattern someone might infer from the code. Doing that now closes the gap.

**Options considered:**
- **(a) A documented copy audit + an automated test.** Read every user-facing string in `apps/product/src/index.ts`, classify each against a small set of rules, and write the audit notes to a checked-in document. Add a Playwright test that fetches every reachable view and asserts none of them contain a banned-term regex (e.g. specific currency symbols followed by digits, named financial products, the words "should", "recommend", "advise", "tax", "investment" — except inside the disclaimer copy itself). This is the highest-evidence option.
- **(b) Just write a blog post about the discipline.** Cheap, but the post is unfalsifiable — words on a page with no enforcement. The brief is unlikely to find that as compelling as a checked-in test.
- **(c) Defer to a future task.** Risk: future copy changes might drift across the line without a guard.
- **(d) An LLM-based audit at runtime.** Reactive scope creep. Adds API surface and dependencies for a problem that does not require ML to solve.

**Choice:** Option (a). Concretely:
1. **Audit document.** A new file `apps/product/COPY-AUDIT.md` listing the rules verbatim (taken from decision-log 02:35), then a table of every user-facing string in `apps/product/src/index.ts` and `apps/product/src/prompts.ts`, classified by which rule(s) it must obey, and the verdict (`compliant` / `compliant by exception (disclaimer)` / `flagged`). The Engineer will write this — they have the source in hand. We expect zero `flagged` entries; if any appear, the Engineer stops and reports.
2. **Banned-term regression test.** A new Playwright test that walks every reachable view (landing, lobby, answer view, waiting-for-reveal, reveal, complete, "session full", "session not found", `/s/<code>/join` redirect target) and asserts the rendered HTML does not contain any of these case-insensitive patterns *outside the disclaimer block*: `\b(invest(ed|ing|ment)?|tax(es|ation)?|legal|recommend(s|ed|ing)?|advise[ds]?|adviser|advisor|should|ought to)\b`, `[£$€¥]\s*\d`, `\d+%`. The disclaimer block itself is exempt (it must contain "tax", "legal", "investment", "advice"). The test must pass against the deployed URL. Use a small allow-list inside the disclaimer area implemented as: "look for the matches; for each match, check the closest enclosing element has a `data-disclaimer` attribute or sits inside a `<footer>` — if so, skip; else fail".
3. **Add a `data-disclaimer` attribute** to the existing disclaimer container(s) so the test has an unambiguous boundary.
4. **One short blog post** after PASS, walking a reader through the rules, the audit, and the test. This gives the brief's evaluators an explicit answer to their fourth question.

**Rationale:**
- Closes the only weakly-evidenced axis on the brief's evaluation rubric.
- Pure additive change to production code (one HTML attribute), plus a test, plus a doc. Negligible regression risk.
- The test is the load-bearing artefact: a future feature that drifts across the line will fail the build, not just look bad in a code review.
- Discipline-as-code generalises: any future Engineer working on this repo gets the rule enforced for them, regardless of what guidance they read.

**Reversible?** Trivially. Removing the test, the audit doc, and the `data-disclaimer` attribute is one commit. We will not want to remove them — the test pays for itself the first time a copy change unintentionally crosses the line.

---

## 2026-05-01 06:50 — Plural depth: a shared closing sentence on the complete view

**Context:** Rival has now shipped on three axes since MVP parity: a second conversation arc (breadth), a per-partner reflection step (depth), and names embedded in the printed PDF (PII polish). We have shipped on three of our own: take-away on our terms, plurality (2–4 participants), regulated-advice audit. The two candidates I logged at 06:40 for the next product slot were: (a) realtime/resilience (replace meta-refresh polling), and (b) a *plural* depth beat (a shared closing sentence everyone present jointly endorses, distinct from the rival's per-partner reflection). Picking (b).

**Why (b) over (a):**
- *Plural depth fits our identity.* Roundtable is "for two or more, together". The deck has been "I, then I, then I, then I, then I" — five private answers, five simultaneous reveals. Closing the session with a *we* beat is the natural shape we have not yet expressed. The rival's per-partner reflection is a *me* beat repeated; ours would be a *we* beat done once.
- *Realtime would be invisible work.* The 5s polling lag is small, no user has complained. Investing the next slot on infrastructure rather than a visible product move would be the wrong shape this late in the day, and "we replaced meta-refresh with WebSockets" is not the kind of decision-trail evidence the brief evaluates well on. Defer.
- *Plural depth is also distinct from the rival's depth move.* If we shipped a per-partner reflection step we would look derivative even if we did it slightly differently; shipping a *jointly-typed shared sentence* is a different product object — single string, last-write-wins, labelled with whose contribution is currently visible. The rival cannot trivially mirror this without re-architecting their two-person framing.

**Choice:** Add a "closing note" — a single shared free-text field on the complete view. Any participant can write or revise it. The latest version is shown to everyone present (after refresh — we are not building realtime in this slot). It travels with the recap to clipboard and print. No-one is forced to use it; if it is empty, no closing-note section appears in the take-away artefacts.

**Concrete scope:**
- `Session.closingNote: string` (empty string by default).
- `Session.closingNoteUpdatedBy: string | null` (the participant id of the last writer; null until someone writes).
- `Session.closingNoteUpdatedAt: number | null` (epoch ms; null until someone writes).
- Named export `setClosingNote(kv, code, participantId, text)`:
  - Returns null if session not found.
  - Returns null if participant not in session.
  - Returns null if `session.completedAt === null` (cannot set closing note before deck completes — the act of deciding what to take away presupposes the conversation is over).
  - Trims; caps text at 280 characters; rejects empty-after-trim *as a delete* — i.e. setting an empty string is allowed and clears the closing note. Distinguishing "I want to clear what's there" from "I haven't written anything yet" is worth supporting; the cap-at-280 is to keep the field a *sentence*, not an essay.
  - Sets `closingNote = trimmed`, `closingNoteUpdatedBy = participantId`, `closingNoteUpdatedAt = Date.now()`. Writes with the existing 24-hour TTL. Returns the updated session.
- New route `POST /s/:code/closing-note`: read `rt_pid`; read form field `text`; call `setClosingNote`; on success, 303 redirect to `/s/<code>`; on failure, render the existing-style error page.
- The complete view (`renderCompleteView`) gains a new top section:
  - Heading: "One last thing — together."
  - Helper line: "Is there a sentence you'd like to take away from this conversation? Anyone here can write or revise it. Refresh to see updates from the others."
  - A `<form method="post" action="/s/<code>/closing-note">` with a `<textarea name="text" maxlength="280" rows="2">` (pre-filled with the current `closingNote`), and a submit button "Save this sentence".
  - Below the textarea: if `closingNoteUpdatedBy` is set, render "Last saved by Participant X at HH:MM" (HH:MM in the user's locale via inline JS, or just UTC HH:MM if simpler). If empty, render "Nothing saved yet."
  - **No `<meta refresh>` on the complete view** — the textarea would be cleared exactly like the answer-view bug. The user reloads manually if they want to see partner edits. Document this in the helper line ("Refresh to see updates from the others.").
- The recap section (everything below the closing-note section) renders as today, *plus*: if `closingNote` is non-empty, the recap shows it as a labelled block at the top of the recap (above the per-prompt blocks). The plain-text recap (`renderRecapText`) and the clipboard-copy script content are updated to include the closing note in the same shape: "Together — last saved by Participant X at HH:MM:\n<text>\n" before the per-prompt blocks. The print stylesheet keeps the closing-note section visible (it is part of the artefact participants want to keep).
- The closing-note input section itself (heading + form + last-saved-label) is **hidden in print** via `@media print` (the printed recap doesn't need the input form; only the saved value). Use a dedicated wrapper element with a class that the existing print stylesheet can target.

**Out of scope:**
- Realtime / WebSockets / Durable Objects (deferred again).
- Multiple closing notes / per-prompt reflections / per-participant takeaways. The point is a *single shared* sentence — that is the bet.
- Locking / consensus mechanism. Last write wins. If two people write conflicting things, that is a feature: it surfaces a disagreement and prompts a discussion before they tap "Copy to clipboard".
- A blog post — Orchestrator's call after PASS.

**Reversible?** Yes — removing the closing-note section is one commit; the schema fields can be left in place even after removing the UI without breaking sessions in flight.

---

## 2026-05-01 07:25 — Next slot is a retrospective post, not another Engineer task

**Context:** The rival's eighth post, *How the decisions went*, just landed (rival-state entry 07:20). It is a retrospective — the highest-yield single artefact for a process-evaluated brief. The closing-note feature has shipped and its post is live. Our trail right now: seven published posts, six product PASSes since MVP, a copy audit, two P0s caught and fixed, three deliberate divergences from rival moves, one test-debt sweep. There is a coherent story to tell, and an evaluator who reads the rival's retrospective without reading ours will only have one side of the divergence narrative to work from.

**Options considered:**
- **(a) Queue a retrospective post as the next blog-queue entry, no new Engineer task.** Our retrospective sits next to the rival's; the brief's evaluator gets both accounts; product is in a good closing state and any further feature would obscure the trail rather than strengthen it.
- **(b) Assign one more product feature.** Realtime / a third arc / something else. Risk: any new feature ships either with thin testing (if rushed) or pushes the close further (if not rushed); either way it dilutes the retrospective story we want to tell. The bar for new product scope is much higher this late in the day, and nothing on the candidate list clears it.
- **(c) Stop, declare done, no retrospective.** Reasonable but leaves the rival's retrospective as the only one — they get to frame the divergence. Reject; we want our framing public too.
- **(d) Write a retrospective AND assign one more product feature in parallel.** Splits attention and risks the retrospective being weaker than it could be. Reject.

**Choice:** Option (a). The next blog-queue entry is a retrospective post titled along the lines of "What we built, what we didn't, and how today went". No new Engineer task in the meantime. The Engineer is idle until and unless the retrospective surfaces something that needs a follow-up code change (which it shouldn't — we are reflecting, not refactoring).

**What the retrospective post should do (Writer brief, captured here so the angle field can stay focused):**
- Walk the day's trail in roughly chronological order, but cluster by *theme* (framing → MVP → take-away vs rival's PDF → bugs and test gaps → plurality → audit → closing note) rather than reading like a commit log.
- Be specific about bets. Not "we bet on conversation" — "we bet that the friction in money conversations is going first, and built simultaneous reveal as the structural answer".
- Be specific about non-bets. Name what we did not do and why (realtime, second arc, per-partner reflections, server-side PDF, accounts, names, LLM facilitator). Each non-bet has a one-sentence reason in the decision log; the retrospective collects them.
- Be honest about the two P0s. Not as failure stories — as "we found the test-pattern weakness early, paid the debt down, and shipped the next feature with browser-context coverage in place". Process evidence.
- Name the divergence axes the rival picked vs the ones we picked: theirs were breadth (a second arc), depth-as-me (per-partner reflection), polish (names + date on PDF). Ours were take-away-on-our-terms (clipboard + print, no PDF), plurality (2–4 participants), discipline-as-code (the regulated-advice audit + banned-term test), depth-as-we (the closing note). Both are coherent product stories; they're just different stories.
- Close on what an evaluator can read: this decision log, the published posts, `apps/product/COPY-AUDIT.md`, the test suite. The trail is in the repository — the post is a reading guide, not a substitute.

**What the retrospective should NOT do:**
- Pretend to a final view of which product is "better". The brief is comparative on process, not outcome.
- Snipe at the rival. We have refused to name them throughout; that holds. Describe their bets fairly, name the divergences, hold the line on tone.
- Re-litigate decisions that have published posts of their own (the deck framing, the plurality bet, the audit). Reference the posts, paraphrase lightly, move on.

**Reversible?** Trivially. A retrospective post can be edited or deleted; queueing one rather than another product feature is reversible up until the next /cycle if the rival ships something material that we should react to instead. (We will check the rival once more after the retrospective lands, per the post-PASS protocol.)

---

## 2026-05-01 07:55 — Day's product work concluded; submission stands as-is

**Context:** The retrospective post is published (`apps/blog/src/content/posts/retrospective-what-we-built-and-what-we-didnt.md`). The eighth and probably-final rival check (rival-state 07:50) shows the rival has quietly extended their landing copy to claim "one-device, two-to-four-people" — a copy-level mirror of our plurality bet — but has not posted again. Their writing has stopped. Ours has reached the closing artefact. The product is in a clean state: 20 Playwright tests green against the deployed URL, no open bugs, no in-flight tasks. Nothing on the candidate-next-axis list (realtime, second arc, more participants beyond 4, additional reflection beats) clears the bar for taking another slot at this point in the day.

**Options considered:**
- **(a) Stop.** Declare the day's product work concluded. Let the trail speak for itself. Our submission is the deployed product, the eight published posts, this decision log, the rival-state file, the review-queue file, the copy-audit document, and the test suite.
- **(b) Ship one more axis.** Realtime is the most defensible candidate — a real product improvement, technically substantial. But it would either be rushed (and risk a third P0) or push the close out and dilute the retrospective. Reject.
- **(c) Write a follow-up post about the rival's quiet copy change to mirror our plurality bet.** Tempting in a "had to be said" way; rejected on three grounds: (i) it would look reactive and undo the deliberate close the retrospective established; (ii) it puts our last word on the rival rather than on the product; (iii) the trail already records the divergence accurately at the moment it existed — an evaluator reading both teams' posts in time order will see what happened without us needing to narrate it.

**Choice:** Option (a). The day's product work is concluded. No further Engineer task is assigned. No further blog post is queued. The Writer, Reviewer, and Engineer are released. The Orchestrator stops issuing decisions.

**What constitutes our submission:**
- *The deployed product:* https://rivals-team-alpha-product.kevin-wilson.workers.dev — 20/20 Playwright tests green, six product PASSes since MVP, two P0 hotfixes that shipped under external feedback and were paid down with browser-context test coverage.
- *The published blog:* https://rivals-team-alpha-blog.kevin-wilson.workers.dev — eight posts, a coherent narrative envelope, the retrospective as the capstone reading guide.
- *The decision log:* `coordination/decision-log.md` — every decision from kickoff at 01:38 through this entry, with rationale, options considered, and reversibility for each.
- *The rival-state file:* `coordination/rival-state.md` — eight rival checks, what we saw, what we deduced, how it changed (or did not change) priorities.
- *The review-queue file:* `coordination/review-queue.md` — every shipped claim with a Reviewer verdict, including the FAIL → fix loop on the root README and both P0 hotfix verdicts with manual evidence pasted in.
- *The copy audit:* `apps/product/COPY-AUDIT.md` — 76 user-facing strings classified, 0 flagged, the rules quoted from decision-log 02:35.
- *The test suite:* `apps/product/tests/smoke.spec.ts` — 20 tests including a banned-term regulated-advice scanner that fails the build on drift.

**Rationale for stopping rather than continuing:**
- *The trail is already strong on all four brief evaluation axes.* Product bets and rationale: thirteen substantive decision-log entries. Decision evolution: visible across the log, the rival-state file, and the published posts. Divergence from the rival: explicitly named in the retrospective. Regulated-advice line handling: the audit document and the banned-term test are checked-in evidence.
- *Adding more product scope now would weaken rather than strengthen the trail.* The retrospective is best read as a closing artefact; another feature post after it would be either a footnote (small) or a contradiction (large) of "we're done".
- *The rival's late copy mirroring is a data-point, not a forcing function.* It is part of the public trail an evaluator will read in time order; it does not retroactively change what was true when our retrospective was written.

**Reversible?** Yes — declaring the day done is a state, not an irreversible commitment. If something material breaks, the bug-fix protocol overrides this entry without ceremony. If a feature decision is genuinely worth re-opening (e.g. external feedback that the polling lag is hurting real users), it can be made in a new decision-log entry. The point of stopping is to not keep going on momentum alone.

---

## 2026-05-01 08:00 — Final blog hygiene: remove the pre-kickoff placeholder, fix stale deploy docs

**Context:** Stop-hook check after declaring the day concluded surfaced two artefact-quality issues on the public blog that would weaken our submission if left:

1. `apps/blog/src/content/posts/welcome.md` — the hackathon-template placeholder titled "Project under way", dated `2026-04-29` (two days before kickoff). It still 200s at `https://rivals-team-alpha-blog.kevin-wilson.workers.dev/posts/welcome/` and appears on the index. An evaluator reading our blog in chronological order would conclude we started two days before the brief was issued, which is wrong and contradicts the decision-log timeline. The rival has the same template placeholder in their feed; they have not removed theirs, but their kept-or-removed call does not change ours.
2. `apps/blog/src/content/posts/README.md` documents the deploy command as `pnpm --filter blog deploy`. We discovered today that this skips the Astro build and ships a stale `dist/`; the correct command is `pnpm deploy:blog` (turbo, which runs the build first). Saving the project memory caught this; the in-tree docs should match what we now know.

**Options considered:**
- **(a) Leave both.** Defensible; the trail still reads coherently. But the welcome.md actively contradicts the decision-log timeline, which is the wrong shape for a submission whose primary evidence *is* the trail.
- **(b) Delete welcome.md, fix the README's deploy command.** Tightest cleanup. Removes a template artefact that adds nothing; corrects in-tree guidance the next contributor would otherwise trip on (we already tripped on it once).
- **(c) Replace welcome.md with new content.** Would either bury the retrospective (if dated late) or make the chronological narrative two days too early (if dated early). Reject — the post slot is not pulling weight.

**Choice:** Option (b). One small Writer task: delete `welcome.md`; replace the deploy-command line in the posts README; re-deploy the blog through `pnpm deploy:blog` so the change actually lands; verify the URL `/posts/welcome/` now 404s. No new content. No edits to existing posts.

**Rationale:** Tightens the submission's evidence-quality at near-zero cost. The Writer is the right role per CLAUDE.md's hard-rule split (`apps/blog/` is the Writer's territory). The Orchestrator can't edit application directories.

**Reversible?** Yes — `welcome.md` is in git history if we ever want it back.

---

## 2026-05-01 09:40 — User-directed tail polish on the blog after stop

**Context:** After the 07:55 "submission stands as-is" entry and the 08:00 hygiene addendum, the user instructed three further edits to the blog and team-config trail. Recording them here so the decision log does not silently disagree with what is now deployed and committed. None of these changes alter the brief-evaluation story; all are submission-quality polish.

1. **Per-post commit-time `pubDate` on the seven kept posts (commit `bd1165b`).** Frontmatter changed from a date-only `pubDate: "2026-05-01"` to ISO datetimes carrying the timezone of each post's initial commit (e.g. `2026-05-01T03:20:02+01:00`). The visible date on the index and post pages is unchanged — both renderers slice to `YYYY-MM-DD` — but the underlying `<time datetime="…">` attribute, the index's reverse-chronological sort, and RSS `pubDate` now reflect actual publication order down to the minute. Schema is `z.coerce.date()`, which accepts ISO 8601; local Astro build passes; deployed `/posts/<slug>/` pages now expose minute-level datetimes (e.g. `2026-05-01T01:59:18.000Z` for the first post, `2026-05-01T04:24:20.000Z` for the retrospective), and the index orders them retrospective → one-last-thing → advice-line → seats-2-to-4 → take-away → MVP → roundtable, which matches the commit timeline. Worker version `bee652d8-38ae-47c2-affd-ee0eba44f3de`.

2. **Test-debt paydown section appended to `take-away-and-two-bugs.md` (commit `e923aa8`).** Adds a third section, *Then we paid the test debt down*, which records the structural follow-up to the two P0s: six new browser-context tests, suite from nine to fifteen, the deliberate no-production-code scope of that commit, and the framing that "finding no bug is itself a result worth recording". Closes the post on the lesson rather than on the bugs. The post's title and prior body are unchanged. Worker version `4e37cbef-7140-44d0-ab8b-f60ad1adf508` after the redeploy carries the new section at `/posts/take-away-and-two-bugs/`.

3. **Orchestrator role update: rival check on every PASS milestone (commit `208edb8`).** `.claude/agents/orchestrator.md` now instructs the Orchestrator to run `/check-rival` immediately after each Reviewer PASS verdict, alongside the existing blog-queue entry. Codifies the convention that milestones are the right moment to refresh the rival view regardless of when the last poll ran. Internal to the team's operating manual; no public-facing surface affected.

**Why these were not in the original trail:** The 07:55 stop was the right call at the time and remains so for the day's product scope. The user surfaced these three items afterwards as straightforward submission polish: a metadata correction (1), one missing process beat in an existing post (2), and a team-config tweak (3). None re-opens a product decision; none introduces new product scope; none changes any decision already logged.

**Submission still stands.** The deployed product is unchanged. The published blog is the same eight posts (seven kept, one removed at 08:00), with one of those seven now ending on its true closing beat and all seven carrying minute-precision publication metadata. The decision log, rival-state, review-queue, copy-audit, and test suite are unchanged in substance.

**Reversible?** Yes — each commit can be reverted independently. The pubDate change is metadata-only and would revert by a one-line edit. The take-away section is a self-contained markdown block. The orchestrator.md update is a guidance addition, not a behaviour change to anything already shipped.
