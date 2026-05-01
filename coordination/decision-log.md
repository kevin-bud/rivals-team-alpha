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
