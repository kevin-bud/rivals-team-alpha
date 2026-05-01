# Current task

Set by the Orchestrator. Read by the Writer (this is a Writer task this time, not an Engineer task — `apps/blog/` is the Writer's territory).

**Task:** Final blog hygiene. Two small cleanups, then re-deploy and verify.

Decision-log entry **2026-05-01 08:00 ("Final blog hygiene")** is the binding spec.

What to do:

1. **Delete `apps/blog/src/content/posts/welcome.md`.** It is the hackathon-template placeholder titled "Project under way" dated 2026-04-29 — two days before kickoff. Currently 200s at `https://rivals-team-alpha-blog.kevin-wilson.workers.dev/posts/welcome/` and appears on the blog index. Removing it tightens the chronological narrative.

2. **Update `apps/blog/src/content/posts/README.md`** — replace the line `5. Deploy via \`pnpm --filter blog deploy\`.` with `5. Deploy via \`pnpm deploy:blog\` (this runs the Astro build first via turbo; \`pnpm --filter blog deploy\` skips the build and ships stale \`dist/\`).` Keep the rest of the README untouched. Same change is also fine in any neighbouring "Deploy" prose if you find it.

3. **Re-deploy the blog**: `pnpm deploy:blog` (NOT `pnpm --filter blog deploy`). Verify after deploy:
   - `curl -sS -o /dev/null -w '%{http_code}\n' https://rivals-team-alpha-blog.kevin-wilson.workers.dev/posts/welcome/` — expect **404**.
   - `curl -sS -o /dev/null -w '%{http_code}\n' https://rivals-team-alpha-blog.kevin-wilson.workers.dev/` — expect **200**, and the index should no longer list "Project under way".
   - Loop the seven kept posts and confirm each returns **200**: `mvp-shipped-the-deck-of-five`, `one-last-thing-together`, `retrospective-what-we-built-and-what-we-didnt`, `roundtable-and-the-join-handshake`, `take-away-and-two-bugs`, `the-advice-line-audited-and-locked-in`, `two-or-more-roundtable-seats-2-to-4`.

4. **Do NOT** edit any of the seven kept posts. Do not add new content. Do not change frontmatter on any kept post. The cleanup is *removal* of the placeholder and a one-line *correction* in the posts README.

5. **Do NOT** sign commits.

6. **Do NOT** edit `apps/product/`, `coordination/decision-log.md`, `coordination/review-queue.md`, or `coordination/rival-state.md`.

Definition of done:
- `apps/blog/src/content/posts/welcome.md` removed (one commit).
- Deploy command in `apps/blog/src/content/posts/README.md` corrected (same commit or separate, your call).
- `pnpm deploy:blog` succeeds.
- Manual curl evidence pasted into `coordination/review-queue.md` as a fresh entry: 404 for `/posts/welcome/`, 200 for index, 200 for all seven kept posts.
- This `coordination/current-task.md` updated: Status `awaiting-review`.

Out of scope:
- Editing existing posts.
- Adding new posts.
- Changing the blog's TONE.md, layout, or styling.
- Anything in `apps/product/`.

**Assigned:** 2026-05-01 08:05 UTC — Writer
**Status:** assigned
**Notes:** ~10-minute task. After this lands and the Reviewer (or the Orchestrator's manual curl check) confirms the eight URLs are correctly 7×200 + 1×404, the day's submission is genuinely done.
