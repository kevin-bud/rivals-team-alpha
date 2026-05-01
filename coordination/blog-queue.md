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
**Status:** published
**Post path:** apps/blog/src/content/posts/mvp-shipped-the-deck-of-five.md

---

## 2026-05-01 — Take-away on our terms: clipboard and print, no PDF

**Milestone:** Take-away affordance shipped (commits `34e613a`, `b48f1bb`, `84e1954`; Reviewer PASS at 03:50). The complete view now offers a "Copy to clipboard" button that copies the full plain-text recap and a print stylesheet that hides the chrome so participants can browser-print to PDF on their own device. No new routes, no new storage, footer disclaimer travels with both forms of take-away.
**Angle:** A short post (300–500 words is plenty) explaining a small but pointed product decision: the rival's complete view exports a server-rendered PDF; ours doesn't, on purpose. The argument is that "your browser already has everything; here are two buttons to keep it on your own device" preserves the privacy posture (no extra storage, no PII off-device) while giving participants the same outcome — a personal artefact of the conversation. Worth covering: why server-side PDF was rejected (storage compromise), why email-the-summary was rejected (we said no emails), why the disclaimer line is in the recap text *and* visible in the print stylesheet (the printed thing must still be honest about not being advice). Don't name the rival; refer to "the other team" or "the rival reading of the brief". British English. The Writer may combine this with the next entry (the hotfix post) if it lands first — they share the same week and both are short.
**Status:** published (combined with the next two entries into a single post)
**Post path:** apps/blog/src/content/posts/take-away-and-two-bugs.md

---

## 2026-05-01 — Take-away on our terms (continued): the answer-view refresh that ate user input

**Milestone:** Second P0 hotfix shipped (commits `5642599`, `32c8973`, `f2f8880`; Reviewer PASS at 04:35). External feedback during the second rival check: the answer-view textarea cleared every five seconds because `<meta http-equiv="refresh">` was sitting on a page with user input, navigating the page to itself and rebuilding the form empty. Fix is one deleted line. The same task added (a) a static guard asserting the answer view's HTML never contains a refresh tag and (b) a real-browser-context test that types into the textarea, waits six seconds, and asserts the text persists.
**Angle:** This entry should almost certainly be folded into the previous hotfix post (`A 404 we didn't catch, and why the suite missed it`). They are the same story told twice — both bugs shipped because the test suite used `request.post` patterns that bypassed real browser behaviour, and both were fixed by adding a real `page.goto`/`page.fill` test alongside the routing or markup change. If the Writer hasn't drafted the previous entry yet, combine all three (take-away + 404 hotfix + answer-view hotfix) into a single update with three short sections: "we shipped a take-away on our terms", "we shipped a routing bug, here's how we missed it", "we shipped a meta-refresh bug on the textarea, here's the same lesson again". The closing paragraph should say plainly what we changed in our process: every user-facing surface now needs a real-browser-context test in addition to the request-level tests, because `request.post` checks our handlers but bypasses the page-as-page experience real users have. British English. No advice line. The protocol-deviation note from decision-log 2026-05-01 03:55 still applies — we deferred posts during an outage and only queued them once the product worked again. That's worth one honest sentence too.
**Status:** published (combined with the take-away and 404 entries into a single post)
**Post path:** apps/blog/src/content/posts/take-away-and-two-bugs.md

---

## 2026-05-01 — A 404 we didn't catch, and why the suite missed it

**Milestone:** P0 hotfix shipped (commits `a815f3e`, `d948734`; Reviewer PASS at 04:10). External user feedback flagged that visiting any session's join URL (`/s/<code>/join`) returned a "Session not found" page. Root cause: only `POST /s/:code/join` was routed; the GET that every browser does on a clicked link fell through to 404. The fix is a 303 redirect from GET to the canonical session URL. The same task closed the test gap that allowed the bug to ship: the previous suite only used `request.post` and never simulated a real user clicking the share link with `page.goto`.
**Angle:** The high-leverage post about *process*, not feature. The brief evaluates on "what does your decision trail show about how you reasoned under ambiguity" — admitting and explaining a test gap is exactly that evidence. Worth covering: (1) what was broken in user-visible terms; (2) what the test gap was — `request.post()` checks our handlers but bypasses the URL-as-link path real users take, and we now have an explicit browser-context test that does `page.goto(shareUrl)` precisely to catch this class of bug; (3) what we *didn't* do — we didn't migrate to Durable Objects, didn't change the share URL surface (would have broken any links the host had already shared), didn't expand scope beyond the routing fix and the missing test; (4) the protocol deviation noted in decision-log 03:55 — we deferred queueing the take-away post until the hotfix shipped because writing a celebratory post about a feature whose underlying flow was broken would have been misleading. Honest, short, structured. British English. Mention but do not lean on the take-away post if it has not been combined into this one — they share decision-trail energy. The Writer should default to combining if both are still queued: "we shipped a take-away on our terms" and "we shipped a hotfix" are tonally compatible chapters of a single update.
**Status:** published (combined with the take-away and answer-view entries into a single post)
**Post path:** apps/blog/src/content/posts/take-away-and-two-bugs.md

---

## 2026-05-01 — Paying the test-debt down: six browser-context tests with no production change

**Milestone:** Test-coverage sweep PASSed at 05:25 (commit `625c90d`, Reviewer verdict `1704625`). Six new browser-context Playwright tests were added covering surfaces that previously only had `request.post`/`request.get` coverage: the landing form click, the waiting-for-joiner auto-update via real meta-refresh, the waiting-for-reveal auto-transition, the reveal view's Participant A/B label ordering, the complete view's clipboard button (with permission grant + clipboard read), and the "session not found" page under a real navigation. Suite went 9 → 15. Pure test-only commit — production source diff is empty.
**Angle:** Short. This is a process-evidence post, not a feature post. Worth one paragraph saying what we did and why: after two P0s that both shipped because `request.post` patterns missed real-browser experience, we deliberately spent the next slot covering the remaining user-facing surfaces *before* shipping anything new. None of the six tests revealed a third bug — that is itself a result worth recording (the structural fix has held; the previously-uncovered surfaces work as intended). The Writer is explicitly welcome to **append this to the previous post** (`take-away-and-two-bugs.md`) as a closing section rather than spinning a new file — the narrative line is "we shipped feature → we shipped bug → we fixed it → we shipped another bug → we fixed it → we paid down the debt deliberately so the next slot is feature work, not firefighting." That arc lives best as one piece. Skip the post entirely if the Writer judges the appendix isn't worth the diff to a published file — the trail is in the decision log either way. British English. No advice line.
**Status:** queued
**Post path:** —
