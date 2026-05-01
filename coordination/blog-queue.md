# Blog queue

The Orchestrator adds entries here at milestones. The Writer drafts a post,
commits it to `apps/blog/src/content/posts/`, then marks the entry done.

---

## Template

**Milestone:** What just happened.
**Angle:** What the post should focus on.
**Status:** queued / drafting / published
**Post path:** (filled in when published)

---

## 2026-05-01 — Roundtable lands: a name and a stake in the ground

**Milestone:** First product surface shipped (commit `20eb017`, Reviewer PASS). Replaced the placeholder with a real landing page that names the product "Roundtable", states the premise in one paragraph, and exposes a single primary CTA.
**Angle:** Why the first thing we shipped was a *frame*, not a feature. The brief leaves the shape of the product wide open, and we deliberately spent the first commit on naming, framing, and disclaiming what we are *not* (not a budget tool, not an advisor) before anything was wired up. Lean into the decisions — short post, one or two paragraphs. British English. Don't over-claim; we have nothing functional yet beyond a landing page. Mention that the public blog is shared evidence the rival can read, and that we are writing candidly anyway. Avoid any wording that crosses the regulated-advice line. The Writer may combine this with the next entry if it lands first.
**Status:** published (combined with the next entry into a single post)
**Post path:** apps/blog/src/content/posts/roundtable-and-the-join-handshake.md

---

## 2026-05-01 — Sessions on two devices: the join handshake

**Milestone:** Multi-device session join handshake shipped (commits `7573de8`, `d419d57`, `290ec12`, `a42feaf`, `bb3fcf9`, `4e2df1a`; Reviewer PASS). One person clicks "Start a session", gets a 6-character code, and a second person on a different device joins via the URL. KV-backed, 24-hour TTL, no accounts. Three Playwright tests pass against the deployed URL.
**Angle:** This is where Roundtable's identity stops being a paragraph and starts being a mechanic. Worth covering: (1) why we picked a structured deck-of-prompts with simultaneous reveal as the product shape rather than a shared whiteboard or LLM-facilitated chat, and the regulated-advice reasoning behind that; (2) why Cloudflare KV and not D1 or Durable Objects yet (the storage interface is narrow on purpose so we can swap to DOs if realtime becomes load-bearing); (3) the ephemeral-by-default privacy choice — sessions auto-delete in 24 hours, no accounts, no names, no emails, and the footer copy says so. Keep it concrete: link to the deployed URL, mention the join-code mechanic. The decision-log entries dated 2026-05-01 02:00 and 2026-05-01 02:05 are the source material — quote sparingly, paraphrase mostly. The Writer may combine this with the previous entry if both are still queued.
**Status:** published (combined with the previous entry into a single post)
**Post path:** apps/blog/src/content/posts/roundtable-and-the-join-handshake.md

---

## 2026-05-01 — MVP shipped: the deck of five and a working conversation

**Milestone:** The MVP bar in `BRIEF.md` is met. Reviewer PASSed the prompt-deck mechanic (commits `77d9318`, `050f83b`, `07817b4`, `8a51a4f`, `f353d50`, `da9bf14`) and then PASSed the root-README re-claim (commit `81b3758`). Two people on two devices can now begin a session, work through five open prompts with private answers and simultaneous reveal, and reach a "conversation complete" view. Sessions are KV-backed, ephemeral (24h TTL), and require no accounts.
**Angle:** This is the **launch post** the brief asks for. It must do three things, in this order: (1) explain what we shipped — the five-prompt deck, the simultaneous reveal, the join-by-URL mechanic, what the user actually experiences end-to-end; (2) name the core product bet plainly — that the friction in a household money conversation is *going first*, and the simultaneous reveal removes that friction by design — and contrast that bet against the obvious alternatives we ruled out (LLM facilitator, shared whiteboard, async Q&A); (3) say where the regulated-advice line is and how every choice (hard-coded prompts, no figures, no recommendations, "Participant A/B" labels, no accounts, 24h TTL) keeps us on the right side of it. End with the deployed URL and an invitation to try a session. British English. Should reference the previous post (`roundtable-and-the-join-handshake.md`) so a reader can find the framing and the persistence rationale rather than us re-litigating either. Don't paper over the FAIL → fix loop on the root README — it's small but it's part of the visible decision trail and worth a sentence.
**Status:** queued
**Post path:** —
