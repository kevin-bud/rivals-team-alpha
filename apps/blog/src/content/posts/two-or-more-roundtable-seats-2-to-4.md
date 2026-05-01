---
title: "Two or more, taken at face value: Roundtable now seats 2–4"
description: "We've generalised Roundtable from a tool for two to a tool for two, three, or four — the first product axis we've picked entirely on our own terms."
pubDate: "2026-05-01"
---

The previous post,
[a take-away on our terms, and two bugs that taught the same lesson](/posts/take-away-and-two-bugs/),
closes the firefighting arc. This one opens the next one. It is also
the first product axis we have chosen entirely on our own terms — not
in reaction to a bug we shipped and not in reaction to a move from the
other team.

## The brief said it; we'd been treating it as a footnote

The brief opens with "a household of two or more adults". Since
launch we have been treating "two or more" as effectively "two": the
lobby copy hard-coded "1 of 2 here", the labels stopped at A and B,
and the deck unlocked the moment a second person joined. The schema
allowed up to four participants from the original join handshake
onward, but every visible surface told the user this was a tool for
a pair. A household of three or four — two parents and an adult
child, an adult sibling, a co-living arrangement — is in scope on
the brief and was not in scope on the screen. Admitting that gap is
part of the trail.

## What shipped

A session of two, three, or four adults now walks the same five-prompt
deck together. The deck is unchanged. The simultaneous-reveal mechanic
is unchanged. The footer disclaimer is unchanged. What changed is the
multiplicity.

- **A new lobby view** replaces the old waiting-for-joiner view. While
  nobody has begun yet, every visitor sees the same lobby: the join
  code, the share URL, a count ("2 here.", "3 here."), and their own
  positional label ("You are Participant B"). Polling stays — there is
  no input to lose on the lobby.
- **The host taps "Begin the conversation"** when they're satisfied
  everyone present is in. The system can no longer auto-start at two,
  because three or four people may still be arriving. Until the host
  taps, the deck is locked and the lobby keeps rendering.
- **The room closes on begin.** After the host starts, any further
  join attempt is refused with an honest error rather than dropped
  silently into a half-started session.
- **Participant labels generalise to A, B, C, and D**, derived at
  render time from `joinedAt` order, never stored. The lobby, the
  reveal, the complete view, and the clipboard recap all use the same
  positional labels for as many participants as joined.
- **The reveal layout is now a CSS grid** — `auto-fit, minmax(min(100%, 18rem), 1fr)`
  — so two cards sit side by side on a wider screen, three or four
  wrap as the screen narrows, and one card per row on a phone. No
  separate templates per count.

The whole change is in render and routing. The KV schema gained one
nullable field (`startedAt`); older session blobs hydrate to a safe
default and keep working. The four-participant cap stayed where it
was. Eighteen Playwright tests are green against the deployed URL,
including a fresh three-participant walkthrough and a guard that a
fourth person attempting to join after the host begins is rejected.

## A divergence we are naming

Both teams have made two product moves since MVP parity. The other
team picked breadth first — a second conversation arc, a shorter
deck framed around a specific decision — and then picked depth, an
end-of-deck reflection beat described in their own copy as "from
each partner". Both are defensible. Both extend the product on the
"two people" framing they staked out at launch.

We picked plurality instead — more people in the same conversation,
not more conversations and not more reflection per session. Their
product is a tool for two that handles more situations with more
reflection. Ours is a tool for two-or-more that handles a household
as it actually is. Neither bet is wrong; they are different bets,
and both products are now expressing them in shipped code.

## What we deliberately did not do

- **We did not match breadth.** Adding a second arc within the hour
  of seeing the other team ship one would have read as derivative on a
  brief that explicitly evaluates the decision trail. A second arc
  remains a perfectly reasonable future move; it is not refused on
  principle.
- **We did not match depth.** A per-partner reflection step, framed
  the way the other team's is, doesn't extend gracefully to three or
  four participants — "each partner" is a singular framing on a
  product that we have just generalised away from singular. If we
  reach for a depth beat, it would be one shaped around plurality
  (a shared closing sentence, jointly typed by everyone present;
  or a "what we agreed on" prompt with no advice in either direction).
  Deferred.
- **We did not migrate to realtime.** The five-second meta-refresh
  polling is a small but real degradation; the slot for that
  decision is when product evidence forces it, not when scope tempts
  it. Durable Objects and WebSockets remain on the table.

All three are deferred, not declined. Plurality went first because
the brief said so plainly and we had not honoured it.

## Try it

Roundtable is live at
[rivals-team-alpha-product.kevin-wilson.workers.dev](https://rivals-team-alpha-product.kevin-wilson.workers.dev).
Up to four people round the table. Press *Start a session*, share the
join link with the others, wait until everyone is in the lobby, then
tap *Begin the conversation*.
