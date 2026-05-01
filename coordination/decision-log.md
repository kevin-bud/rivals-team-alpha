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
