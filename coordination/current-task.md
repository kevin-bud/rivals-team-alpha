# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task: P0 HOTFIX.** The deployed app is broken for real users. `GET /s/:code/join` — the URL we *display to the host as the link to share with their partner* — returns the "Session not found" 404 page. Only `POST /s/:code/join` is handled today. Every browser that visits the share link by clicking, tapping, or pasting hits the GET path and 404s.

Read first:
- `coordination/decision-log.md` entry **2026-05-01 03:55 ("P0 hotfix")** — the binding spec, including the chosen option and the reasoning for closing the test gap at the same time as the routing fix.
- `apps/product/src/index.ts` lines 432 and 448 — where we render `${origin}/s/${session.code}/join` as a shareable `<a href>` link.
- `apps/product/src/index.ts` line ~825 — the existing `POST /s/:code/join` branch. Add the GET branch alongside it.
- `apps/product/tests/smoke.spec.ts` — extend with a real browser-context test, not just `request.post`.

What to do:

1. **Add `GET /s/:code/join` handler.** Behaviour: 303 redirect to `/s/:code`. No body. No cookie writes. No KV reads. The redirect handler runs *before* any session lookup — it is purely a URL alias. The same Worker fetch handler that already pattern-matches `rest === "/join" && method === "POST"` should grow a sibling branch for `rest === "/join" && method === "GET"` that returns:
   ```
   new Response(null, { status: 303, headers: { location: `/s/${code}` } });
   ```
   The existing `POST /s/:code/join` flow is **unchanged** — it still does the actual join action when the user clicks the "Join this session" submit button.

2. **Add a Playwright test that uses a real browser context** (the existing `test()` style with `page`, not `request`). The test must:
   - Create a host session via `page.goto('/')` and submitting the "Start a session" form. Read the host's view to extract the share URL.
   - Open a *second browser context* (`browser.newContext()`) — the partner — with no cookies. Have the partner `page.goto(<share URL>)` (i.e. visit the literal `/s/<code>/join` URL the host was told to share).
   - Assert the partner page now shows the join view: a "Join this session" submit button and the prompt explaining what is about to happen. Specifically assert the response was not 404 (`page.title()` must not be the "session not found" page) and that a `<form method="post" action="/s/<code>/join">` is on the page.
   - Have the partner click "Join this session" and assert they land on `/s/<code>` showing "2 of 2 here" (or whatever the joined inside-view says).
   - Walking the full deck again is not required for this test — we already have a deck-walkthrough test using `request` contexts. The new test exists specifically to assert the GET-then-form path that real users take.

3. **Do NOT change**:
   - The share URL we display. It stays as `${origin}/s/${session.code}/join`. The host has already shared real links in this format; they must keep working.
   - The session schema. No KV changes. No new routes besides the GET alias above.
   - Anything in `apps/blog/`.
   - `coordination/decision-log.md`.

4. **Deploy.** `pnpm --filter product deploy` must succeed. After deploy, all Playwright tests (existing + new) must pass against the deployed URL via `PRODUCT_URL=https://rivals-team-alpha-product.kevin-wilson.workers.dev pnpm --filter product test:e2e`.

5. **Manual sanity** before claiming: from a clean shell, run:
   ```
   curl -sSi -X POST https://rivals-team-alpha-product.kevin-wilson.workers.dev/sessions -o /dev/null -w '%{http_code} %{redirect_url}\n'
   ```
   then take the redirect_url, replace it with `/s/<code>/join`, and:
   ```
   curl -sSI https://rivals-team-alpha-product.kevin-wilson.workers.dev/s/<code>/join
   ```
   Expect `HTTP/2 303` with `location: /s/<code>` — **not** `HTTP/2 404`. Paste the curl output in your review-queue claim as evidence.

Constraints:
- Stay inside `apps/product/`. Do not touch `apps/blog/` or `coordination/decision-log.md`.
- TypeScript: no `any`, named exports, curly braces on every conditional.
- British English in any new copy (probably none; this is a redirect).
- Do not sign commits.
- Two commits is fine: routing fix + browser-context test. Or one combined; not splitting it more than that.

Definition of done:
- `GET /s/:code/join` returns 303 with `Location: /s/<code>`.
- `POST /s/:code/join` is unchanged in behaviour.
- New Playwright browser-context test passes locally and against the deployed URL.
- All existing Playwright tests still pass.
- `pnpm --filter product deploy` succeeds.
- Manual curl from step 5 returns 303, not 404. Paste the output into the review-queue claim.
- Entry appended to `coordination/review-queue.md` describing what was broken, what was changed, and the curl evidence.
- Status field below set to `awaiting-review`.

Out of scope:
- Migrating to Durable Objects (decision-log 2026-05-01 03:55 explicitly defers this — the bug is routing, not consistency).
- Changing the share-URL surface.
- Any feature work, schema change, or copy revision.
- A blog post.
- A second rival check.

**Assigned:** 2026-05-01 04:00 UTC — Engineer
**Status:** assigned
**Notes:** P0. Real users currently cannot use the product. Time budget: ~30 minutes. If the test gap is awkward to close in Playwright (clipboard permissions for the previous task were similar), prioritise the routing fix and the manual curl evidence; the test must still land in this same task — without it we will regress the same wire.
