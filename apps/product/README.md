# Product app

This is the product. The Engineer replaces `src/index.ts` with whatever
the team decides to build.

## How a session works

One person — the host — taps "Start a session" on the landing page and
gets a short join code plus a shareable link. Anyone they share the
link with opens it on their own device and joins; a session can hold
two, three, or four adults from the same household. Everyone waits in
a lobby until the host taps "Begin the conversation" — once the host
begins, the room closes and no further joiners are accepted. The app
then walks every participant through a fixed deck of five prompts:
each person types their answer privately, and only when everyone in
the session has submitted does the app reveal all the answers
together. They talk it through, tap to advance, and the loop repeats
until the last prompt — at which point a "conversation complete"
recap shows every prompt with each participant's answer, and the
session deletes itself within 24 hours. After the deck, anyone present
can write a single shared sentence to take away — last write wins, and
it travels with the recap. The complete view offers a "Copy to
clipboard" button and a print-friendly layout so participants can keep
the conversation on their own device.

## Stack

The starting point is a single Cloudflare Worker — `src/index.ts`. There
is deliberately no framework, no database, no UI library. Those are
decisions the agent team makes based on the brief.

When you adopt a framework, update this README and `apps/product/package.json`
to reflect the new toolchain.

## Scripts

- `pnpm --filter product dev` — local dev server via `wrangler dev`.
- `pnpm --filter product build` — `wrangler deploy --dry-run` to validate config.
- `pnpm --filter product deploy` — deploy to Cloudflare Workers.
- `pnpm --filter product test:e2e` — Playwright end-to-end tests.
- `pnpm --filter product lint` — ESLint.

## Tests

`tests/smoke.spec.ts` is a single Playwright test that hits the deployed
URL and asserts a 200 response and the page body contains the expected
content. The Reviewer agent extends this — every shipped feature should
get a Playwright test. Tests run against `PRODUCT_URL` if set, otherwise
against `http://localhost:8787` for local dev.

Keep the tests passing. The Reviewer gates "shipped" claims on green
tests against the deployed URL.

## Cloudflare resources

### KV: sessions

The product persists session state in a Cloudflare KV namespace,
keyed by a 6-character join code, with a 24-hour TTL on every key.
See `coordination/decision-log.md` (entry dated 2026-05-01 02:05) for
why KV over D1 / Durable Objects.

- Binding name: `SESSIONS`
- Production namespace ID: `37dd7af6aae54de999a4f764a05e55b0`
- Preview namespace ID: `b879e0e7df454924a0c3a28417d0fb75`

These IDs are not secrets — they identify the namespace within the
account but cannot be used without a Cloudflare token.

### Fresh-clone setup

`pnpm install` and then `pnpm --filter product dev` should be enough.
The KV namespaces above already exist on the team's Cloudflare account
and are referenced by ID in `wrangler.jsonc`; you do not need to
re-create them. If you are setting up a different account, run
`wrangler kv namespace create roundtable_sessions` and
`wrangler kv namespace create roundtable_sessions --preview` and
swap the IDs in `wrangler.jsonc`.

If the brief calls for further resources (D1, R2, Durable Objects),
add the binding to `wrangler.jsonc`, provision via the Cloudflare
Developer Platform MCP (or `wrangler` CLI), and record the decision
in `coordination/decision-log.md`.
