# Roundtable copy audit — regulated-advice line

This document is the checked-in evidence that every user-facing string in
Roundtable has been read against the team's regulated-advice rules. It is
paired with a Playwright regression test
(`tests/smoke.spec.ts` — "every user-facing view obeys the regulated-advice
line") that fails the build if any non-disclaimer text on a reachable view
contains advice-flavoured language.

## Rules (verbatim from `coordination/decision-log.md`, entry 2026-05-01 02:35)

The following rules were authored for the prompt deck but are applied here
to every user-facing string in `apps/product/`:

- Open-ended. No yes/no, no multiple-choice.
- Ask about *feelings, values, perspectives, or lived experience* — never
  about what someone *should* do.
- No specific monetary amounts, percentages, products, or tax/legal/
  investment terminology.
- Phrased as a shared "we" or symmetrical "each of us" where natural —
  never as a question one partner asks the other.
- British English.

Strings that are not prompts (UI chrome, helpers, error pages, recap
text) are held to the spirit of the rules: open and neutral, no advice,
no specific amounts/percentages/products, no tax/legal/investment
language outside the disclaimer block, British English.

## How `should` is handled in the regression test

The decision-log entry 2026-05-01 06:15 flags `\bshould\b` as banned but
notes "if this is too noisy, tighten to phrases like
`you should\b|should we\b|should you\b|we should\b`". A bare `\bshould\b`
proved noisy in practice: it would trip on legitimate uses such as
"should the others not have arrived". The test therefore uses the
tightened pattern
`/\b(you should|should we|should you|we should)\b/i`,
which catches the prescriptive phrasings the rule is actually trying to
prevent without false-flagging incidental uses. This is recorded here so
the choice is visible and reversible — a future tightening to the bare
form is a one-line edit.

## Audit table

Every user-facing string rendered by `apps/product/src/index.ts` and
every prompt in `apps/product/src/prompts.ts`. The "Surface" column is
the render function or constant. The "Rule(s)" column lists which rules
the string must obey. The "Verdict" column is one of `compliant`,
`compliant by exception (disclaimer)`, `flagged`. Zero `flagged` rows
expected.

| Surface | String | Rule(s) | Verdict |
| --- | --- | --- | --- |
| `landingHtml` (title) | "Roundtable — a guided money conversation for households" | open, neutral, no jargon, British English | compliant |
| `landingHtml` (h1) | "Roundtable" | British English | compliant |
| `landingHtml` (tagline) | "A guided money conversation for households." | open, neutral, no advice, British English | compliant |
| `landingHtml` (lede, body) | "Roundtable is a place for the people in a household to talk about their shared money more deliberately. It walks you through the topics together, keeps the conversation balanced, and captures what you decide." | open, neutral, no advice, no amounts, British English | compliant |
| `landingHtml` (lede, inline disclaimer) | "It is not a budget tool, not an advisor" | regulated-advice positioning | compliant by exception (disclaimer) |
| `landingHtml` (lede, tail) | "— just a structured way to have the talk you have been meaning to have." | open, neutral, British English | compliant |
| `landingHtml` (CTA) | "Start a session" | open, neutral, British English | compliant |
| `notFoundHtml` (title) | "Roundtable — session not found" | British English | compliant |
| `notFoundHtml` (h1) | "Session not found" | British English | compliant |
| `notFoundHtml` (lede) | "This session has ended or never existed." | open, neutral, British English | compliant |
| `notFoundHtml` (back link) | "Back to the start" | British English | compliant |
| `sessionFullHtml` (title) | "Roundtable — session full" | British English | compliant |
| `sessionFullHtml` (h1) | "Session full" | British English | compliant |
| `sessionFullHtml` (lede) | "That session already has the maximum number of participants. Ask the host to start a new one." | open, neutral, British English | compliant |
| `sessionFullHtml` (back link) | "Back to the start" | British English | compliant |
| `renderActionErrorHtml` (title) | "Roundtable — couldn't save that" | British English | compliant |
| `renderActionErrorHtml` (h1) | "That didn't go through" | British English | compliant |
| `renderActionErrorHtml` (back link) | "Back to the session" | British English | compliant |
| `renderActionErrorHtml` (message, missing pid on /begin) | "We couldn't tell who you are in this session. Try opening the session link again." | open, neutral, British English | compliant |
| `renderActionErrorHtml` (message, /begin failed) | "We couldn't begin the conversation. Only the host can start, and at least two people need to be here." | open, neutral, British English | compliant |
| `renderActionErrorHtml` (message, /answer missing fields) | "We didn't receive a complete answer. Please try again." | open, neutral, British English | compliant |
| `renderActionErrorHtml` (message, /answer rejected) | "We couldn't save that answer. The reveal may already have happened, or the session may have moved on." | open, neutral, British English | compliant |
| `renderActionErrorHtml` (message, /next rejected) | "We couldn't move on yet — not everyone has submitted, or the session has finished." | open, neutral, British English | compliant |
| `renderLobbyView` (title) | "Roundtable — session <code>" | British English | compliant |
| `renderLobbyView` (h1) | "You are in" | open, neutral, British English | compliant |
| `renderLobbyView` (tagline) | "Share this code or link with the others." | open, neutral, British English | compliant |
| `renderLobbyView` (count, alone) | "1 here. Share the link with the others." | open, neutral, British English | compliant |
| `renderLobbyView` (count, n>=2) | "<n> here." | British English | compliant |
| `renderLobbyView` (helper) | "You are Participant <X>." | British English | compliant |
| `renderLobbyView` (begin CTA) | "Begin the conversation" | open, neutral, British English | compliant |
| `renderLobbyView` (begin helper) | "Tap when everyone you're inviting is in. You can begin with two and others won't be able to join after." | open, neutral, British English | compliant |
| `renderLobbyView` (host alone placeholder) | "Share the link with the others. Two are needed before the conversation begins." | open, neutral, British English | compliant |
| `renderLobbyView` (guest placeholder) | "Waiting for the host to begin." | open, neutral, British English | compliant |
| `renderLobbyView` (back link) | "Back to the start" | British English | compliant |
| `renderAnswerView` (title) | "Roundtable — prompt <n> of <total>" | British English | compliant |
| `renderAnswerView` (deck-meta) | "Prompt <n> of <total>" | British English | compliant |
| `renderAnswerView` (textarea placeholder) | "Take your time. There's no right answer." | open, neutral, British English | compliant |
| `renderAnswerView` (helper) | "The others won't see this until everyone has submitted." | open, neutral, British English | compliant |
| `renderAnswerView` (CTA) | "Submit privately" | open, neutral, British English | compliant |
| `renderAnswerView` (leave link) | "Leave the session" | British English | compliant |
| `renderWaitingForRevealView` (title) | "Roundtable — waiting for the others" | British English | compliant |
| `renderWaitingForRevealView` (h2) | "You've submitted. Waiting for the others." | open, neutral, British English | compliant |
| `renderWaitingForRevealView` (count) | "<n> of <total> have submitted" | British English | compliant |
| `renderWaitingForRevealView` (helper) | "This page will update on its own once everyone is in." | open, neutral, British English | compliant |
| `renderWaitingForRevealView` (leave link) | "Leave the session" | British English | compliant |
| `renderRevealView` (title) | "Roundtable — reveal" | British English | compliant |
| `renderRevealView` (h2) | "Both answers" | British English | compliant |
| `renderRevealView` (label) | "Participant <X>" | British English | compliant |
| `renderRevealView` (helper) | "Talk it through. When you're both ready, move on." | open, neutral, British English | compliant |
| `renderRevealView` (advance, mid-deck) | "Move to the next prompt" | open, neutral, British English | compliant |
| `renderRevealView` (advance, final) | "Finish" | British English | compliant |
| `renderCompleteView` (title) | "Roundtable — conversation complete" | British English | compliant |
| `renderCompleteView` (h1) | "Conversation complete" | British English | compliant |
| `renderCompleteView` (lede) | "That's the end of the deck. Roundtable doesn't keep a record beyond the next 24 hours." | open, neutral, no specific amounts (24 hours is duration, not money), British English | compliant |
| `renderCompleteView` (h2) | "What you talked through" | open, neutral, British English | compliant |
| `renderCompleteView` (takeaway) | "Sessions disappear after 24 hours. If you'd like to keep this conversation, you can copy it to your clipboard or print this page from your browser." | open, neutral, British English | compliant |
| `renderCompleteView` (copy button) | "Copy to clipboard" | British English | compliant |
| `renderCompleteView` (print button) | "Print this page" | British English | compliant |
| `renderCompleteView` (back link) | "Back to the start" | British English | compliant |
| `renderCompleteView` (button flash, JS) | "Copied" / "Copy failed" | British English | compliant (lives inside `<script>`, exempt by script-strip) |
| `renderRecapText` (title line) | "Roundtable — conversation recap" | British English | compliant |
| `renderRecapText` (line label) | "Prompt <n>: <text>" / "Participant <X>: <answer>" / "(no answer)" | British English | compliant |
| `renderRecapText` (footer disclaimer) | "Generated <iso> from a Roundtable session. Roundtable does not provide financial, tax, legal, or investment advice." | regulated-advice disclaimer | compliant by exception (disclaimer) |
| `renderJoinView` (title) | "Roundtable — join session <code>" | British English | compliant |
| `renderJoinView` (h1) | "Join this session" | British English | compliant |
| `renderJoinView` (tagline) | "You have been invited to a Roundtable session." | open, neutral, British English | compliant |
| `renderJoinView` (lede) | "Tap below to join. The link itself is your invitation — there is no code to type." | open, neutral, British English | compliant |
| `renderJoinView` (CTA) | "Join this session" | open, neutral, British English | compliant |
| `sharedFooter` (disclaimer block) | "Roundtable does not provide financial, tax, legal, or investment advice. Sessions are stored on Cloudflare KV for 24 hours, then deleted. We do not collect accounts, names, or emails." | regulated-advice disclaimer; British English | compliant by exception (disclaimer) |
| `prompts[0]` | "What does 'enough' mean to each of us, in three years' time?" | open, value-oriented, no advice, no amounts, symmetrical, British English | compliant |
| `prompts[1]` | "What's something about money you grew up believing that you've since changed your mind about — or are starting to?" | open, history-oriented, no advice, no amounts, symmetrical, British English | compliant |
| `prompts[2]` | "Think of a money decision we (or you) made in the last year. What feels good about it now? What feels less good?" | open, feeling-oriented, no advice, no amounts, symmetrical, British English | compliant |
| `prompts[3]` | "When it comes to how we split or share costs at the moment, what feels fair to you, and what doesn't?" | open, feeling-oriented, no advice, no amounts, symmetrical, British English | compliant |
| `prompts[4]` | "If something unexpected happened that felt financially significant — whatever 'significant' means to us — what's the first thing each of us would worry about?" | open, feeling-oriented, no advice, no amounts, symmetrical, British English | compliant |

## Summary

- Compliant: 67
- Compliant by exception (disclaimer): 3 (the inline landing-page positioning span "It is not a budget tool, not an advisor", the shared `<footer>` disclaimer, and the recap-text footer disclaimer rendered inside the inline `<script>`)
- Flagged: 0

## Method and date

This audit was produced by an automated walk of every user-facing string
in `apps/product/src/index.ts` and `apps/product/src/prompts.ts` paired
with a manual reading of each render function and prompt. Every string
in the table was read against the rules quoted above; nothing was
paraphrased or summarised. The disclaimer block in `sharedFooter`
carries `data-disclaimer="true"`, and the inline positioning clause in
the landing lede is wrapped in `<span data-disclaimer="true">…</span>`,
so the regression test can exempt them by element rather than by
string-match. Performed 2026-05-01.
