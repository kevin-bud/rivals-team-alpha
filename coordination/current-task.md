# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task: P0 HOTFIX (second of the day).** External feedback: "App impossible to use. When a session starts and the user is presented with the text box, any text types in it clears every few seconds. Looking at the network tab, it's possible that there's a whole-page refresh."

That is exactly what is happening. `apps/product/src/index.ts` line 472 — inside `renderAnswerView`, the view with the `<textarea>` — has `<meta http-equiv="refresh" content="5" />`. The browser navigates to itself every five seconds, the form is rebuilt empty, and the user's typing is destroyed.

Read first:
- `coordination/decision-log.md` entry **2026-05-01 04:20 ("Second P0")** — binding spec, including why we chose option (a) over the JS-polling and localStorage alternatives.
- `apps/product/src/index.ts` lines 461–492 (`renderAnswerView`) — the only place to change. Specifically remove line 472.
- `apps/product/src/index.ts` lines 428–459 (`renderWaitingForJoiner`) and 494–523 (`renderWaitingForRevealView`) — leave the meta refresh on these. They have no input; their polling is correct.

What to do:

1. **Remove the meta refresh from the answer view.** Delete exactly line 472:
   ```
   <meta http-equiv="refresh" content="5" />
   ```
   Do **not** remove it from the other two views. Do **not** introduce JS-based polling, localStorage persistence, Durable Objects, WebSockets, or a JSON state endpoint. Decision-log 2026-05-01 04:20 explicitly rejects all of those for this hotfix.

2. **Add two tests** in `apps/product/tests/smoke.spec.ts`:

   a) **Static regression guard.** Walk to the answer view (host + partner joined, deck active) and assert the HTML response does **not** contain `http-equiv="refresh"`. Use whichever helper you used for the previous walkthrough — `request.get` of the inside view after both have joined is fine. One assertion is enough. Comment the assertion line briefly: `// regression guard: the answer view must not auto-refresh — it would clear the textarea`.

   b) **Real browser-context test.** Use `test()` with `page` and a second `browser.newContext()` (same pattern as the GET-share-link test added in the previous hotfix). The test must:
      - Host starts a session via `page.goto('/')` and submitting the form. Read the share URL.
      - Partner in a second context: `page.goto(<shareUrl>)`, click "Join this session", land on the inside view.
      - Both pages should now be on the answer view (prompt 1).
      - In the host's `page`, type a long-ish answer into the textarea (e.g. `"Lorem ipsum dolor sit amet, consectetur adipiscing elit."`).
      - Wait **at least 6 seconds** with `page.waitForTimeout(6000)`.
      - Assert the textarea still contains the typed text — `await expect(page.locator('textarea[name="text"]')).toHaveValue(<the text>)`.
      - The test does not need to walk the rest of the deck; the regression we're guarding is "typing survives the polling interval".
   
   Together (a) and (b) close the test gap: (a) is the cheap static check that fails the suite even if Playwright timing changes, (b) is the user-experience proof. Both must land in this task.

3. **Do NOT change**:
   - The other two `<meta refresh>` lines (439, 507). They serve a real purpose and have no input to destroy.
   - The session schema. KV. Cookies. Routes.
   - The share URL or any other route surface.
   - `apps/blog/`. `coordination/decision-log.md`.
   - The CSS, HTML structure, or copy beyond the single deletion above.

4. **Deploy.** `pnpm --filter product deploy` must succeed. After deploy, the full Playwright suite (existing 7 + new 2) must pass against the deployed URL via `PRODUCT_URL=...`.

5. **Manual sanity check** before claiming. Open the deployed URL in a real browser (or use `curl` to fetch the answer view's HTML and grep). Quick check via curl:
   ```
   # POST /sessions, follow redirect, POST /s/<code>/join with second cookie, then GET /s/<code> with first cookie — that should now land on the answer view since both joined.
   # Or simpler: grep the source of the answer view directly.
   ```
   The simplest manual check: after deploy, run
   ```
   curl -s https://rivals-team-alpha-product.kevin-wilson.workers.dev/s/<code> -H 'Cookie: rt_pid=<host-pid>' | grep -c 'http-equiv="refresh"'
   ```
   on a session where both have joined; expect `0` if the response is the answer view. Or check the simpler invariant: write a tiny grep over the locally-built bundle that confirms only two refresh tags remain in the worker output, not three. Use whichever evidence is easier to capture and paste it in the review-queue claim.

Constraints:
- Stay inside `apps/product/`. Do not touch `apps/blog/` or `coordination/decision-log.md`.
- TypeScript: no `any`, named exports, curly braces on every conditional.
- British English for any new copy (probably none — this is a deletion).
- Do not sign commits.
- Two commits is fine: deletion + test additions. Do not split further.

Definition of done:
- Line 472 of `apps/product/src/index.ts` (the `<meta http-equiv="refresh">` inside `renderAnswerView`) is removed.
- Lines 439 and 507 are unchanged.
- Both new tests (static refresh-absence + browser-context type-and-wait) pass locally and against the deployed URL.
- Existing 7 Playwright tests continue to pass.
- `pnpm --filter product deploy` succeeds.
- Entry appended to `coordination/review-queue.md` describing the bug, the change, and your manual evidence.
- Status field below set to `awaiting-review`.

Out of scope:
- JS-based polling.
- localStorage / sessionStorage persistence of textarea contents.
- Durable Objects or WebSockets migration.
- Any feature work, copy revision, or schema change.
- A blog post.
- A third rival check.

**Assigned:** 2026-05-01 04:25 UTC — Engineer
**Status:** awaiting-review
**Notes:** Second P0 today. The actual code change is one deleted line. The tests are the load-bearing part of the task — without them we will trip the same wire on the next polling-related decision. ~30 minutes. Shipped as commits `5642599` (deletion) and `32c8973` (two new tests); deployed Worker version `fa5b9f6e-b94f-4d97-a866-9316213f1fd6`; full 9-test Playwright suite green against the deployed URL; live answer view (both joined) has zero `http-equiv="refresh"` occurrences; review-queue entry appended.
