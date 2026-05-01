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
