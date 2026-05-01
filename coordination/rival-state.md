# Rival state

Updated by the Orchestrator after each rival check. Most recent at top.

---

## YYYY-MM-DD HH:MM

**Product URL state:** What's at the rival's product URL right now.
**Recent posts:** Latest 3 entries from the rival's blog feed, summarised.
**Implications:** Does this change our priorities? Why or why not.

---

## 2026-05-01 03:15 — First rival check (post-MVP milestone)

**Rival:** rivals-team-beta — `https://rivals-team-beta-product.kevin-wilson.workers.dev/`

**Product URL state:** Product is live and named **"Common Ground"**, tagline "A household money conversation, together". CTA "Start a session" linking to `/session` with subtext "One device, two people, no sign-up". Self-described as "six structured prompts together" ending with "a shared summary you can save as a PDF." Privacy claim is unusually strong: "Your answers stay on this device — they are never sent to or stored on a server." Disclaimer present and worded almost identically to ours: "Common Ground does not provide financial, tax, legal, or investment advice. It is a tool to help you talk to each other." The actual session interface lives at `/session` — we did not deep-fetch it on this check; the landing copy is enough to read the bets.

**Recent posts:** Three on their blog feed.
1. *Introducing Common Ground* (Fri 01 May 2026) — what they are building, who it is for, where they sit on the advice line.
2. *Why one device, one session* (Fri 01 May 2026) — defends synchronous, single-device, in-page state as their architectural choice.
3. *Project under way* (Wed 29 Apr 2026) — a brief project-launch note, dated **before** the hackathon kickoff. Either pre-kickoff prep was published, or the team was given the brief earlier; not load-bearing for our priorities either way.

**Implications:**

The rival has converged with us on the framing (guided household money conversation, structured prompts, no sign-up, explicit advice-line disclaimer) but **diverged sharply on three load-bearing bets**:

1. **One device vs two.** They picked single-device side-by-side; we picked two-device join-by-URL with simultaneous reveal. Our decision-log entry 2026-05-01 02:00 explicitly considered and rejected the single-device path because "the friction in money conversations is *going first*" and a one-device flow can't structurally remove that friction. Their decision is coherent — sitting next to each other on one device is its own ergonomic choice — but it is the *opposite* of our central bet. This is exactly the kind of divergence the brief's evaluation is looking for.
2. **Six prompts vs five.** Tactical difference, not strategic. Not worth reacting to.
3. **Saved PDF summary vs ephemeral / nothing kept.** They give participants a take-away artefact; we delete everything in 24 hours and offer no export. This is a *real* product-experience gap: at the end of a Common Ground session you have a thing; at the end of a Roundtable session you have a memory. Their "never sent to a server" claim is also a stronger-sounding privacy story than our "stored on KV for 24 hours" framing, even though our model has its own integrity.

**Does this change our priorities?**

- **Product shape: no change.** The two-device simultaneous-reveal mechanic is our identity. Switching now would be a re-pivot, not an iteration, and the decision log already explains why we chose it. Holding the line.
- **Take-away gap: worth a small decision before the next feature task.** The deck-complete view already shows the full recap of prompts and answers in-browser, so the *content* exists; what is missing is the affordance — users can copy-paste but we don't help them. Candidate small additions, in order of preference:
  - A "Copy this conversation" button on the complete view that copies the recap to the clipboard as plain text. Zero new storage, zero new dependencies, fully on our existing privacy promise.
  - A print-friendly stylesheet (`@media print`) so users can browser-print to PDF *on their own device*. Same privacy posture; addresses the PDF gap directly.
  - A `?download` query that returns the recap as a `text/plain` attachment via the existing route. Same posture, no extra storage.
  - We deliberately do **not** offer email/share-link based take-away — we said "no emails", and the rival's PDF gap is small enough that we shouldn't compromise that.
- **Privacy framing: worth a copy revisit at some point**, not now. The current footer ("Sessions are stored on Cloudflare KV for 24 hours, then deleted") is honest. We could add a clarifying line that explains *why* a brief server-side stay is structurally required by the two-device design (the second device has to read the session from somewhere). That's a Writer call when they draft the launch post, not an Engineer task.
- **Cadence: don't react to their post count.** They have three posts, we have one combined post (and the launch post is queued). The brief evaluates the decision trail, not volume. Quality over count.

**Next task implication:** the next Engineer task should be small and add the in-browser take-away affordance (option A above as a baseline, optionally B as a tiny add-on). This is the lowest-cost, on-strategy response to the only material gap the rival check exposed. Will be decided in the decision log before assignment.

---

## 2026-05-01 04:15 — Second rival check (post-hotfix milestone)

**Rival:** rivals-team-beta — `https://rivals-team-beta-product.kevin-wilson.workers.dev/`

**Product URL state:** Still "Common Ground", same one-device positioning, same six-prompts framing, same PDF-summary take-away. One small copy change since the previous check: the disclaimer block has expanded to include "does not tell you what to do with your money" alongside the existing "does not provide financial, tax, legal, or investment advice." Otherwise unchanged on the landing page. We did not deep-fetch `/session` again — the change of substance is on the blog, not the landing copy.

**Recent posts:** Five on their feed now, two new since the last check (03:15):
1. *Introducing Common Ground* (Fri 01 May 2026) — unchanged.
2. *The session now runs end to end* (Fri 01 May 2026) — **new**: they have a working MVP. Six prompts, "a saveable summary, and a privacy claim we can now demonstrate." Roughly the equivalent of our MVP launch post.
3. *Why one device, one session* (Fri 01 May 2026) — unchanged.
4. *Worth coming back to* (Fri 01 May 2026) — **new**: they have added a reflection step between the final prompt and the summary. A "let it sit before you save" beat in the flow.
5. *Project under way* (Wed 29 Apr 2026) — unchanged.

**Implications:**

- **MVP parity confirmed.** Both teams have a working session end-to-end. Their bet (one device, six prompts, PDF summary) and ours (two devices, five prompts, simultaneous reveal, clipboard + print) are now both expressed in shipped code. This is the moment the brief's "where did you and the rival diverge" question is most legible — the divergence is now in two products, not two intentions.
- **Their "reflection step" is interesting but not for us to copy.** A pause between the last prompt and the recap is a fine UX choice in their single-device flow — it gives the user a beat to slow down before committing to a saved artefact. In our flow the simultaneous-reveal already enforces a pause-and-discuss beat at every prompt; adding another reflection step before the recap would be redundant. Holding our shape.
- **Their expanded disclaimer ("does not tell you what to do with your money") is plain-English and tonally good.** Worth considering as a copy revision to our footer, but not urgent. Our disclaimer is already on-line; theirs is just slightly warmer. Not a priority.
- **No change to our priorities from this check.** Take-away affordance has now shipped (PASS at 03:50) and the P0 routing hotfix has shipped (PASS at 04:10). Both PASSes have posts queued. The next material question is the operator's *new* user-feedback report — see decision-log entry that follows this. The rival check did not surface anything that should preempt the P0.

---

## 2026-05-01 04:40 — Third rival check (post-second-hotfix milestone)

**Rival:** rivals-team-beta — `https://rivals-team-beta-product.kevin-wilson.workers.dev/`

**Product URL state:** Unchanged from the 04:15 check. Same landing copy, same "Common Ground", same one-device positioning, same expanded disclaimers ("does not provide financial, tax, legal, or investment advice" + "does not tell you what to do with your money"). No deep-fetch of `/session` on this check — landing alone is enough to confirm no shift in positioning.

**Recent posts:** Same five posts as the 04:15 check, no new entries since:
1. *Introducing Common Ground* (Fri 01 May 2026)
2. *The session now runs end to end* (Fri 01 May 2026)
3. *Why one device, one session* (Fri 01 May 2026)
4. *Worth coming back to* (Fri 01 May 2026)
5. *Project under way* (Wed 29 Apr 2026)

**Implications:** None for our priorities. The rival has not shipped anything visible in the last ~25 minutes. Our next move is unchanged: drain the three queued posts via the Writer, then return to product decisions. Logging this check in keeping with the post-PASS protocol ("regardless of when the last check ran"), but recording it here rather than burning a decision-log entry — there is no decision to make.

---

## 2026-05-01 05:30 — Fourth rival check (post-test-sweep PASS)

**Rival:** rivals-team-beta — `https://rivals-team-beta-product.kevin-wilson.workers.dev/`

**Product URL state:** Substantive change since the 04:40 check. The landing page now has **two CTAs** (was one): `/session?arc=open` and `/session?arc=purchase`. The "open" arc is the original six-prompt deck; the "purchase" arc is a shorter five-prompt deck framed around a specific decision the household is considering. All previous copy (tagline, privacy, disclaimers) is unchanged. They have shifted from a single-deck product to a multi-arc product.

**Recent posts:** One new post since the 04:40 check:
- *Two conversations, not one* (Fri 01 May 2026) — **NEW**. Announces the second conversation arc. Frames the change as "a second, shorter conversation arc for specific occasions alongside the original". Confirms that the original "open" arc is unchanged and the new arc is purely additive.

The other five posts are unchanged from prior checks.

**Implications:**

This is the first rival move since MVP parity that genuinely changes the product surface. Worth taking seriously without reacting reflexively.

- **What they did:** added a second arc, kept the first. Pure addition. They picked breadth ("more decks for more occasions") as their next product axis.
- **What our equivalent move would be:** add a second arc to Roundtable. Mechanically tractable — our `prompts` module is already an array of `{ id, text }`, sessions already carry a `currentPromptIndex`, and an arc-id query parameter would slot into `createSession` cleanly. Cost: half a day of Engineer time plus prompt authoring (which is an Orchestrator responsibility — see decision-log entry 2026-05-01 02:35 on prompt-authoring rules).
- **Why we should hesitate before doing it:** copying the *axis* of the rival's last move within an hour of seeing it would look derivative and erode the decision trail. The brief evaluates on "where did you and the rival diverge" — diverging deliberately on at least one axis is more interesting than tracking them on every axis they pick.
- **Where we can divergently extend instead, if we want a "next product move":**
  1. **Depth, not breadth.** Add an end-of-deck "what we've each taken from this" beat — one shared, jointly-typed sentence at the end of the conversation, optionally included in the recap. Makes the conversation more reflective without adding more decks. Our existing complete view already shows 5 × 2 answers; adding a single 11th joint answer is a small change with a different shape from "another arc".
  2. **Resilience, not surface area.** Replace meta-refresh polling with proper realtime (Durable Objects + WebSockets). Smaller user-visible payoff but addresses the "your partner has joined" beat being slow on real networks.
  3. **Plurality, not specificity.** Lean into 3+ participants gracefully (the count copy currently breaks past two; the Reviewer flagged this earlier). Households are sometimes three or four adults, not always two — addressing that is on-brief and we have not done it.
- **What I am not doing right now:** committing to any of the above. Logging the option set so the next decision moment has it teed up. The next `/cycle` decision should weigh "match their breadth" vs. "pick our own axis" rather than defaulting to either.

**Decision implication for this moment:** none. The current task (test sweep) PASSed and a post is already queued. The next product decision happens *after* the Writer drains the queue. The rival's move belongs in that decision, not this rival-state entry.

---

## 2026-05-01 06:05 — Fifth rival check (post-plurality PASS)

**Rival:** rivals-team-beta — `https://rivals-team-beta-product.kevin-wilson.workers.dev/`

**Product URL state:** Landing page **unchanged** from the 05:30 check. Same two arcs (`?arc=open`, `?arc=purchase`), same one-device-two-people framing, same disclaimers. No signal of multi-participant expansion beyond two — they remain locked into the two-person side-by-side premise.

**Recent posts:** One new post since the 05:30 check:
- *Taking forward* (Fri 01 May 2026) — **NEW**. Adds an end-of-deck per-partner reflection step ("features reflections from each partner on their key takeaways from the session"). The wording specifies "each partner" — they are still framing the product around two people.

The other six posts are unchanged.

**Implications:**

The rival has now moved on **two** axes since MVP parity: breadth (the second arc, ~04:40) and depth (the per-partner reflection step, this check). Together those map to options 1 and 2 in the candidate set I logged at 05:30 — i.e. they have taken the two product axes I considered most likely for us. Plurality (option 4) was the one I chose and just shipped; resilience (option 3, realtime) remains unmoved by either team.

- **Does this change our priorities?** No, not in this moment. The plurality post is queued and the Writer is the next dispatch. Our just-shipped move is more *distinctive* now, not less — they doubled-down on "two people" with the reflection beat, while we explicitly extended to two-or-more.
- **Does it change the *next* decision?** It informs it. Two of the four candidate axes I listed at 05:30 are now expressed in their product but not ours. The next `/cycle` decision should reckon with whether we want a depth beat (option 2) of our own — not by mirroring "each partner reflects" (which would feel derivative *and* doesn't fit our 3–4-participant generalisation gracefully) but by asking what a *plural* depth beat would look like. Two candidate framings:
  1. **A shared closing sentence**, jointly typed by everyone present (one box, all hands, one final sentence to take away). Strengthens "this is a *together* tool" — fits our plurality bet.
  2. **A "what we agreed on" prompt** at the end — not a recommendation, not advice, but a chance to name what (if anything) the conversation surfaced as common ground between the participants.
- *Both candidates would be picked deliberately, not in response to the rival's reflection step.* Either could go in the next slot. The other strong candidate remains plurality polish (the participant-cap of 4 is arbitrary; we could test whether 3-of-3 and 4-of-4 work in real network conditions, or address the small remaining UX rough edges in the lobby copy).
- **What I am explicitly *not* doing right now:** committing to any of the above. Logging the implications so the next decision moment has them teed up. Continuing to prefer divergent moves over reactive ones.

**Decision implication for this moment:** none — same as the previous check. The post is already queued; the Writer is the next hand-off. The next product decision lives in the `/cycle` after that.

---

## 2026-05-01 06:40 — Sixth rival check (post-audit PASS)

**Rival:** rivals-team-beta — `https://rivals-team-beta-product.kevin-wilson.workers.dev/`

**Product URL state:** Landing page **unchanged** from the 06:05 check. Same two arcs, same two-people-on-one-device positioning, same disclaimers. They have not extended to multi-participant.

**Recent posts:** One new post since 06:05:
- *Names and a date on the printed PDF* (Fri 01 May 2026) — **NEW**. Described as a minor improvement to help users distinguish multiple saved session documents. Implies the PDF artefact now embeds participant names and the session date.

The other seven posts are unchanged.

**Implications:**

- *Names* is a meaningful divergence from where they were. Their previous privacy framing was anonymous, no-sign-up, no-server. A printed-PDF-with-names is still client-only by their architecture (no server in their model), but the artefact now travels with PII attached. We made the opposite call from the start: positional labels A/B/C/D, no names anywhere, locked in by the audit we just shipped.
- *Date on the PDF* is a sensible polish move that does not affect us — our recap text already includes a generated-at line.
- **Does this change our priorities?** No. The names-on-the-PDF move actually sharpens our existing distinctive bet (positional labels, no PII). The audit we just shipped (`COPY-AUDIT.md` + the banned-term test) locks in the discipline that prevents us from drifting toward names. Their move strengthens our story rather than challenging it.
- **Note for the next decision moment:** the rival has now made four moves since MVP parity — breadth (a second arc), depth (per-partner reflection), cosmetic polish (names-on-PDF), and an unchanged single-device, two-person base. We have made three on our terms — take-away, plurality (2–4), regulated-advice audit. Two clear axes remain candidates for our next move: (a) realtime/resilience (replace the meta-refresh polling), (b) a *plural* depth beat (a shared closing sentence everyone present jointly endorses, distinct from the rival's per-partner reflection). Neither is forced by this rival check; both remain teed up for the next `/cycle`.

**Decision implication for this moment:** none. Audit post is queued. Writer is the next hand-off.

---

## 2026-05-01 07:20 — Seventh rival check (post-closing-note PASS)

**Rival:** rivals-team-beta — `https://rivals-team-beta-product.kevin-wilson.workers.dev/`

**Product URL state:** Landing page **unchanged** since the 06:40 check. Same two arcs, same one-device-two-people framing, same disclaimers, same names-on-PDF tagline. They have not touched the product surface in the last 40 minutes.

**Recent posts:** One new post since 06:40:
- *How the decisions went* (Fri 01 May 2026) — **NEW**. A *retrospective* — "examining the bets made on Common Ground, how they evolved, and what the outcomes reveal about the project's trajectory." This is a meaningfully different kind of post from the prior eight; it is the closing-arc artefact a process-evaluated brief actively rewards.

**Implications:**

This is the most important signal of the day. The rival has stopped shipping product changes and started writing *meta* — a retrospective on the day's decisions. Two readings, both probably true:
1. *They are winding down.* Eight posts plus a retrospective is a coherent narrative envelope for a one-day hackathon. The brief evaluates on decision trail, and a retrospective is the highest-yield single artefact for that question.
2. *They are claiming the framing.* If we don't write one and they do, the only retrospective an evaluator reads will be theirs — including their account of "where we and the rival diverged". Their account will be honest but it will be theirs. We owe an evaluator a comparable artefact that tells the same story from our side.

**Does this change our priorities?** Yes — it changes the *next* move. Our just-shipped closing note has a queued post. The Writer will draft and publish that next. After that, the next blog-queue entry should be **our own retrospective**, not another product feature. We have shipped enough product today to have a decision trail worth retrospectively walking — six product PASSes since MVP plus seven published posts plus a copy audit; the trail will read coherently end-to-end.

**Concrete plan for the next two hand-offs:**
1. Writer drafts the closing-note post (currently queued, will be dispatched next).
2. After that PASS-post pair settles, the Orchestrator queues a retrospective post on the blog-queue (Orchestrator action), then hands to Writer to draft it. The retrospective should walk the day's decision trail in chronological order, name the bets we made, the bets we deliberately did not match, the two P0 bugs we shipped and what each one taught us, and where the divergence with the other team has settled.
3. **No new Engineer task is assigned in the meantime.** The product is in a good closing state. Adding another feature now would obscure the retrospective rather than strengthen it.

**Where the rival check leaves the option set for after the retrospective:**
- (a) Realtime / resilience — still deferred, still defensible to defer. The retrospective is a better next move than realtime.
- (b) Another product feature on a third axis — possible if there is one with strong on-strategy reasoning, but we should require a much higher bar at this point in the day for new product scope.
- (c) Stop, declare done, let the trail speak. Reasonable.

I am explicitly not committing to (b) or (c) in this entry. The Writer drains first, then the Orchestrator decides at the next `/cycle`.

**Decision implication for this moment:** I am noting in the trail (here, not in the decision log) that **the next blog-queue entry I add will be a retrospective**, not a product-feature post. This is a deliberate prioritisation prompted by the rival's retrospective landing first. The decision-log entry that records this prioritisation will be written when I queue the entry, not in advance.

---

## 2026-05-01 07:50 — Eighth (and probable final) rival check (post-retrospective)

**Rival:** rivals-team-beta — `https://rivals-team-beta-product.kevin-wilson.workers.dev/`

**Product URL state:** **One quiet but meaningful change** since the 07:20 check. Their landing copy now describes the framing as "one-device, two-to-four-people" — previously it was "one device, two people". They have extended their cap to 2–4 participants on the same single device. The rest of the page is unchanged. They have not written a post about this change (yet); the only signal is the landing copy.

**Recent posts:** **No new posts** since 07:20. The feed still ends at *How the decisions went*. Their writing has stopped.

**Implications:**

1. **They copied the plurality axis into their copy.** Their previous "two people on one device" was the *one* axis where our plurality bet was structurally distinctive. Now their copy claims 2–4 too, on a single device. We do not know without deep-fetching `/session` whether the underlying flow actually generalises or whether the change is copy-only; either way, the *narrative* axis where we claimed divergence has narrowed.
2. **Our retrospective was already published before this rival change.** Our retrospective accurately describes the state of both products at the moment it was written. We do not retroactively edit posts; the rival's later copy change is part of the public trail an evaluator will read in time order.
3. **Their writing has stopped.** They are done. Eight posts plus a retrospective is their closing envelope.

**Does this change our priorities?** No.

- *Should we respond by writing another post?* No. Writing a post-after-the-retrospective explaining the rival's quiet copy change would look reactive and obscure the close. Our retrospective is the closing artefact. It stands.
- *Should we ship more product to re-distinguish?* No. Adding scope at this point in the day to chase a rival's copy change is exactly the trap the brief evaluates against — process over reaction. Holding the line.
- *Are we done?* Yes. The product is in a clean closing state, the trail is complete, the eight published posts are coherent end-to-end, and the regulated-advice audit + test sit in the repository as discipline-as-code. The rival's late copy change is a footnote to the day; our day's decision narrative does not need to absorb it.

**Decision implication:** I will write **one final decision-log entry** declaring the day's product work concluded and naming the evidence that constitutes our submission, then stop. No further Engineer task. No further blog post. No further rival check unless something material breaks.
