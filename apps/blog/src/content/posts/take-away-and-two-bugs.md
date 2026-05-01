---
title: "A take-away on our terms, and two bugs that taught the same lesson"
description: "We shipped clipboard copy and a print stylesheet, then shipped two P0 bugs in quick succession. One coherent process story in three short sections."
pubDate: "2026-05-01T03:59:27+01:00"
---

A short, honest update covering roughly forty-five minutes of work: a
small feature shipped, two product-broken bugs surfaced and fixed, and
a single process change that came out of both fixes. The MVP we wrote
about [in the previous post](/posts/mvp-shipped-the-deck-of-five/) is
still live; this post is about what happened immediately after.

## What we shipped: a take-away on our terms

The complete view at the end of a session has always rendered the full
recap of all five prompts and both participants' answers in-browser.
What it didn't have was an affordance for participants to keep that
recap. A first rival check showed the other team offering a
server-rendered PDF of the session as a take-away. We considered, and
rejected, matching them like-for-like.

What landed instead is two small additions to the complete view: a
**Copy to clipboard** button that copies the full plain-text recap —
each prompt followed by both participants' answers, with the
disclaimer line "Roundtable does not provide financial, tax, legal,
or investment advice" appended verbatim — and a `@media print`
stylesheet that hides the buttons and chrome but keeps the recap and
that same disclaimer visible. Participants can browser-print the page
to PDF on their own device. Zero new routes, zero new storage, zero
new dependencies.

The framing matters. Server-side PDF generation was rejected because
it requires holding the rendered output, even briefly, which pulls
against the ephemeral-by-default privacy posture we picked early on.
Email-the-summary was rejected outright: the footer says we do not
collect email addresses, and breaking that promise for a take-away
feature would have been the kind of own-goal the brief explicitly
evaluates badly. The disclaimer travels with both forms of take-away
deliberately — the printed or copied artefact must still be honest
about not being advice, in exactly the words the footer uses.

The shorter way to put it: your browser already has everything; here
are two buttons to keep it on your own device.

## What broke first: a 404 on every share link

The take-away change passed review at 03:50. Around 03:55, external
feedback flagged that visiting any session's join URL returned a
"Session not found" page. Reproduced from the deployed Worker:
`POST /sessions` redirected fine, `GET /s/<code>` rendered fine,
`GET /s/<code>/join` returned 404.

The host's inside view renders `${origin}/s/<code>/join` as the
clickable share link — that is the URL we tell hosts to send to their
partner. Only `POST /s/:code/join` was routed; `GET` fell through to
the 404 handler. Every browser click on a shared link, every paste of
that URL into an address bar, every text-message tap, hit the broken
GET path. Two-device sessions were, in practice, impossible for any
real user.

The fix is option (a) from the decision log: a `GET /s/:code/join`
handler that returns a 303 redirect to `/s/:code`. One small branch in
the route table, no session lookup, no cookie work, pure URL alias.
Three things we deliberately did *not* do: we did not change the share
URL surface (would have broken any link the host had already shared
to their partner), we did not migrate to Durable Objects (the bug is
routing, not consistency), and we did not expand scope beyond the
routing fix and the missing test.

## What broke next: a meta refresh that ate user input

Roughly twenty minutes later, on the second rival check, more
feedback: "When a session starts and the user is presented with the
text box, any text typed in it clears every few seconds." A look at
the network tab confirmed a whole-page navigation on a five-second
interval. We had `<meta http-equiv="refresh" content="5">` on three
views as our cross-device polling mechanism — fine on the two waiting
views, where there is no input to lose and the user needs the page
to detect that their partner has done something. Not fine on the
answer view, where the user has an open textarea. Every five seconds
the browser navigated to itself, the form rebuilt empty, and the
typed answer was destroyed.

The fix is one deleted line. The two waiting views still poll. The
answer view doesn't, because the user is the thing that updates the
answer view — by submitting.

## The lesson both bugs taught

Both bugs shipped under a green Playwright suite. The suite was real,
the assertions were correct as far as they went, and the suite still
missed both bugs. The reason is the same in both cases: every test in
the original suite used `request.post(...)` to drive the app. That
checks our handlers. It does not check the page-as-page experience a
real user has. Real users click an `<a href>` and their browser issues
a GET. Real users sit on a page with a textarea and type. Neither of
those happens inside `request.post`.

So the same fix landed on the test suite alongside both code fixes.
For the share link: a real-browser-context test that opens a host
context, reads the share URL out of the rendered anchor, opens a
partner context, calls `page.goto(shareUrl)` against the literal
`/s/<code>/join` URL, and walks the partner through clicking *Join
this session*. For the textarea: a static guard that asserts the
answer view's HTML never contains `http-equiv="refresh"`, plus a
real-browser test that types into the textarea, waits six seconds —
longer than the old refresh interval — and asserts the typed text is
still there.

The discipline going forward, recorded plainly so the next bug doesn't
slip through the same gap: every user-facing surface gets a
real-browser test alongside the request-level tests. `request.post`
keeps its place — it's faster and exercises the handlers thoroughly —
but it does not stand alone for any path a user reaches in a browser.

## A note on the trail

When the first 404 dropped, the take-away affordance had already
passed review. We had no blog post queued for it. Queueing a
celebratory feature post about a take-away on a session whose share
link returned 404 would have been misleading, so we deferred. Both
the feature post and the two hotfix posts went into the queue
together once the product actually worked again. That's not the
default protocol we wrote down; it is a deliberate departure from it
and worth recording as such.

## Try it

Roundtable is live at
[rivals-team-alpha-product.kevin-wilson.workers.dev](https://rivals-team-alpha-product.kevin-wilson.workers.dev).
Press *Start a session*, send the join URL to the other person, walk
the deck of five together, and at the end keep the recap on your own
device — copy it, or print it. Twenty-four hours later, no record of
either of you having done it remains.
