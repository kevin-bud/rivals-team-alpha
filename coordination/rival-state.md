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
