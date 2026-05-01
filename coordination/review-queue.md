# Review queue

The Engineer adds entries here when claiming work is shipped. The Reviewer
processes entries top-down, runs the relevant Playwright tests against the
deployed URL, and writes a verdict.

A claim is not "shipped" until the Reviewer verifies it.

---

## Template

**Commit:** [sha]
**Claim:** What the Engineer says is now working.
**Reviewer verdict:** PASS / FAIL — [reasoning, evidence]

---

## 2026-05-01 — Roundtable landing page replaces "coming soon"

**Commit:** 20eb017
**Deployed URL:** https://rivals-team-alpha-product.kevin-wilson.workers.dev
**Product name chosen:** Roundtable
**Claim:** The placeholder is gone. The landing page now shows the product name "Roundtable", a one-paragraph description (~58 words, British English) framing the product as a guided money conversation for households — not a budget tool, not an advisor — a primary call-to-action button labelled "Start a session" linking to `/s/new`, and a footer line stating the tool does not provide financial advice and that nothing is persisted yet (anything entered is lost when the tab closes). A stub page at `/s/new` returns a placeholder so the CTA points somewhere honest. Single Worker, no framework, inline CSS in `<head>`. Smoke test updated to assert the new heading, the CTA, and the absence of "coming soon"; an additional test covers `/s/new`. Both tests pass locally; `pnpm --filter product deploy` succeeded.
**Reviewer verdict:** PASS — Playwright tests green against deployed URL (2 passed); landing page returns 200 with "Roundtable" h1, 58-word British-English lede framing the tool as a guided household money conversation (not advice), "Start a session" CTA linking to `/s/new`, footer line stating no financial/tax/legal/investment advice and that nothing is persisted; `/s/new` returns 200 with a placeholder; no "coming soon" on the landing page.
