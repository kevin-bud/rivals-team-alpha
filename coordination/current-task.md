# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Implement the multi-device session join handshake for Roundtable. After this task, two people on two devices can land in the same session via a short code. No prompts, no reveal yet — that comes next.

Read first:
- `coordination/decision-log.md` entries dated 2026-05-01 02:00 (product shape) and 2026-05-01 02:05 (KV for persistence). Implement to those choices.

What to build:

1. **KV namespace.** Provision a Cloudflare KV namespace called `roundtable_sessions` (production binding name `SESSIONS`). Use the Cloudflare Developer Platform MCP or `wrangler kv namespace create`. Add the binding to `apps/product/wrangler.jsonc`. Add a `--preview` namespace too so `wrangler dev` works without hitting prod.

2. **Storage module** at `apps/product/src/sessions.ts`. Narrow surface — keep it swappable to Durable Objects later. Exports (named):
   - `type Session = { code: string; createdAt: number; participants: Array<{ id: string; joinedAt: number }>; }` (extend later, do not over-design now).
   - `createSession(kv: KVNamespace, hostParticipantId: string): Promise<Session>` — mints a 6-character uppercase alphanumeric code (avoid ambiguous chars: no `0/O/1/I/L`), writes with 24-hour TTL.
   - `getSession(kv: KVNamespace, code: string): Promise<Session | null>`.
   - `joinSession(kv: KVNamespace, code: string, participantId: string): Promise<Session | null>` — appends participant if not already present; cap at 4 participants for now (return null with no write if full or if session not found).
   No `any`. No `interface`. Curly braces on every conditional.

3. **Routes** in `apps/product/src/index.ts`:
   - `GET /` — landing page (already shipped). The "Start a session" CTA must now `POST` to `/sessions` rather than link to `/s/new`. Use a `<form method="post" action="/sessions">` so it works with no JS.
   - `POST /sessions` — generate a fresh participant ID (random, e.g. `crypto.randomUUID()`), call `createSession`, set a `Set-Cookie: rt_pid=<id>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`, respond `303 See Other` to `/s/<code>`.
   - `GET /s/:code` — read `rt_pid` cookie. Look up the session.
     - If session not found → 404 page with copy "This session has ended or never existed" and a link back to `/`.
     - If `rt_pid` is one of the participants → render the "inside" view: shows the join code prominently, a shareable URL (`https://<host>/s/<code>/join`), participant count (`1 of 2 here` / `2 of 2 here`), and a placeholder line "Prompts coming next — partner needs to join to continue." Add a `<meta http-equiv="refresh" content="5">` for now so the host page updates when the partner joins. (Polling. We will replace this when we wire realtime.)
     - If `rt_pid` is not a participant → render the "join" view: a `<form method="post" action="/s/<code>/join">` with a single submit button "Join this session". No code input here — the URL itself is the credential.
   - `POST /s/:code/join` — read or mint `rt_pid` cookie; call `joinSession`. On success, `Set-Cookie` if minted and `303` redirect to `/s/<code>`. On failure (full or not found), render an error page.
   - Remove the `/s/new` stub from the previous task.

4. **Tests.** Update `apps/product/tests/smoke.spec.ts`:
   - Keep the landing-page assertions, but the CTA selector must now find a `<button>` inside a `<form action="/sessions" method="post">`.
   - Add a test: post `/sessions`, follow the redirect, assert the response shows a 6-character join code and "1 of 2 here". Use Playwright `request` context; cookies must persist across the redirect.
   - Add a test: from a *second* `request` context (no cookies), POST `/s/<code>/join`, follow redirect, assert "2 of 2 here" appears.
   - Tests must pass against both `http://localhost:8787` (with `wrangler dev` and the preview KV namespace) and the deployed URL (`PRODUCT_URL` set).

5. **README.** Update `apps/product/README.md` with: the KV binding name, the namespace IDs (prod + preview) — the actual IDs, since they are not secrets — and a one-line setup note for cloning the repo fresh.

6. **Privacy copy.** Update the landing-page footer to reflect what is now actually true: "Sessions are stored on Cloudflare KV for 24 hours, then deleted. We do not collect accounts, names, or emails." Replace the previous "nothing is saved" wording — the Reviewer flagged that as honest, and we want to keep it honest.

Constraints:
- Stay inside `apps/product/`. Do not touch `apps/blog/` or `coordination/decision-log.md`.
- TypeScript: no `any`, prefer `type`, named exports, curly braces on every conditional.
- British English in all user-facing copy.
- Do not sign commits. Commit small (storage module, routes, tests, README — separate commits are fine).
- One commit per logical step is preferred over a single megacommit.

Definition of done:
- KV namespace exists, is bound in `wrangler.jsonc` (prod + preview).
- All five routes above work locally with `pnpm --filter product dev` (with `--persist-to` or KV preview namespace as needed).
- All Playwright tests pass locally against the dev server.
- `pnpm --filter product deploy` succeeds.
- After deploy, all Playwright tests pass against the deployed URL.
- An entry has been appended to `coordination/review-queue.md` with the deployed URL and a fresh sample session code (the Reviewer will mint their own — your sample is for sanity).
- Status field below set to `awaiting-review`.

Out of scope:
- Prompts, prompt deck content, simultaneous reveal — that is the *next* task after this one ships.
- Realtime / WebSockets / Durable Objects.
- Custom domain / branding.
- Account creation, email, names.
- Any LLM / AI feature.

**Assigned:** 2026-05-01 02:10 UTC — Engineer
**Status:** awaiting-review
**Notes:** KV namespaces provisioned via `wrangler kv namespace create` (Cloudflare MCP returned 401 auth errors, but `wrangler` is OAuth-authenticated as kevin.wilson@thisisbud.com on the configured account). Prod ID `37dd7af6aae54de999a4f764a05e55b0`, preview ID `b879e0e7df454924a0c3a28417d0fb75`. Binding `SESSIONS` added to `wrangler.jsonc`. All three Playwright tests pass locally against `wrangler dev` and against the deployed URL `https://rivals-team-alpha-product.kevin-wilson.workers.dev`. Sample session code `84YBGQ` minted at deploy time for sanity. See `coordination/review-queue.md` for the full claim.
