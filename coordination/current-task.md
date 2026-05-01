# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Flip the prompt-deck claim from FAIL to PASS by clearing the one bullet the Reviewer flagged: the **repo-root** `README.md` does not describe the product. The brief (`BRIEF.md`, "MVP definition", final bullet) explicitly requires "A short README at the repo root [that] describes what the product is, who it is for, and how to use it." The Reviewer's verdict on the previous claim is in `coordination/review-queue.md` — read it before starting.

What to do:

1. **Update the root `README.md`** (the file at `/Users/kevinwilson/Documents/GitHub/r-and-d-days/the-rivals/rivals-team-alpha/README.md`). Do **not** delete the existing hackathon-template content — it still serves the agents and judges. Insert a new `## Roundtable` section near the top (above or below the existing intro paragraph, your judgement) that contains, at minimum:
   - One sentence saying what Roundtable is. Use the framing from decision-log entry 2026-05-01 01:38: a guided money conversation tool for households. Not a budget tool, not an advisor.
   - One short paragraph (~3 sentences) on who it is for. Two-or-more adults sharing finances, not in crisis, varying levels of comfort with money. Tone: facilitative, not prescriptive.
   - A "How to use it" subsection (3–5 numbered steps) walking through: visit the deployed URL, click "Start a session", share the join link with your partner, take turns answering each prompt privately, discuss the simultaneous reveals, advance through the deck.
   - The deployed URL: https://rivals-team-alpha-product.kevin-wilson.workers.dev
   - One disclaimer line: Roundtable does not provide financial, tax, legal, or investment advice; sessions are stored on Cloudflare KV for 24 hours, then deleted; we do not collect accounts, names, or emails.

2. **Do not** touch `apps/product/` source code, tests, or `apps/product/README.md` — none of those failed review. Re-running tests is not required for this task because nothing executable changed; the previous test run is still valid.

3. Re-deploy is **not** required (nothing in the deployable artefact changed). Do not run `pnpm --filter product deploy`.

4. After updating the root README, **append a new entry** to `coordination/review-queue.md` (do not edit the previous entry — the FAIL stands as part of the trail). The new entry should:
   - Reference the previous FAIL (cite the date and what was missing).
   - State that the root README has been updated, with the path and the relevant section title.
   - Re-claim that "the MVP bar from BRIEF.md is now met."
   - List the commit sha that updates the root README.

Constraints:
- British English in all human-facing copy in the README. Match the tone of the existing landing-page copy: plain, neutral, conversation-flavoured, not advice.
- Do not sign commits.
- Single commit is fine for this — it is a docs-only change.
- Never edit `coordination/decision-log.md`.
- Never paraphrase the regulated-advice line. Use the exact wording from the existing footer copy where you can: "Roundtable does not provide financial, tax, legal, or investment advice."

Definition of done:
- Root `README.md` contains a Roundtable section that satisfies the four bullets in step 1 above.
- A new entry has been appended to `coordination/review-queue.md` with the re-claim.
- Status field below set to `awaiting-review`.

Out of scope:
- Any code changes.
- Re-deploying.
- Re-running the Playwright suite.
- Editing `apps/product/README.md`.
- Editing the existing template content of the root README beyond inserting the new section (small typo fixes are fine; substantive rewrites of template text are not).

**Assigned:** 2026-05-01 03:05 UTC — Engineer
**Status:** assigned
**Notes:** ~15-minute task. Tight scope on purpose — flip the MVP claim with the smallest correct change. Do not expand it.
