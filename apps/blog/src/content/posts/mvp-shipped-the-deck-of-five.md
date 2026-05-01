---
title: "MVP shipped: the deck of five and a working conversation"
description: "Roundtable's MVP is live. Two devices, five prompts, simultaneous reveal, and a clear line about what the tool does not do."
pubDate: "2026-05-01T03:20:02+01:00"
---

The MVP bar from the brief is met. Roundtable is live at
[rivals-team-alpha-product.kevin-wilson.workers.dev](https://rivals-team-alpha-product.kevin-wilson.workers.dev),
two people on two devices can begin a session without us doing
anything for them, and the core mechanic — a guided conversation of
five prompts with simultaneous reveal — works end-to-end. The framing
and the join handshake we covered
[in the previous post](/posts/roundtable-and-the-join-handshake/);
this one is about what now happens after the second device joins.

## What you can do, end to end

One person opens the landing page and presses *Start a session*. The
server mints a six-character join code and redirects them into the
session. They send the join URL — `…/s/<code>/join` — to the other
person, who opens it on their own device and presses *Join this
session*. Both devices now show *Prompt 1 of 5*.

Each person reads the prompt, types a private answer, and presses
*Submit privately*. The other person doesn't see it. They see *1 of 2
have submitted* and a quiet *waiting for the others* line. Once both
have submitted, both answers reveal at once, side by side, labelled
*Participant A* and *Participant B*. Either person can press *Move to
the next prompt* to advance. After the fifth prompt the session ends
on a complete view that recaps all five prompts and both sets of
answers in-browser, with a thank-you line that notes Roundtable does
not keep a record beyond the next twenty-four hours.

The five prompts are hard-coded and deliberately open: a values
question about what "enough" looks like in three years, a history
question about a money belief that has shifted, a recent-decision
question about something that feels good or less good in hindsight, a
present-arrangements question about what feels fair and what doesn't,
and a hypothetical-stress question about what each person would worry
about first if something financially significant happened. The exact
wording is in the deployed app — try it and see.

## The bet underneath the mechanic

A money conversation between two people who share a household is rarely
held back by a lack of information. It is held back by *going first*.
The first person to name a number, or a worry, or a preference, sets
the frame the second person then reacts to. That asymmetry is the
friction. It is also the thing the product is meant to address.

Simultaneous reveal removes it by design. Neither participant can see
what the other has written until they have both committed. The
mechanic isn't a flourish — it is the entire bet. Everything else in
the product is in service of it.

We considered three alternatives carefully before settling on this
one. A shared whiteboard tends to collapse into one person typing
while the other watches; the multi-user property is decorative rather
than structural. An asynchronous question queue stretches the
conversation across days and loses the in-a-single-sitting feel the
brief points at. A chat with an LLM facilitator is the most
interesting of the three, and the most dangerous: the moment an LLM
responds to a specific household's specific situation, the product
quietly becomes an advisor, which the brief excludes. The deck — one
prompt, two private answers, both reveal at once, advance — was the
shape that kept the friction at the centre of the mechanic without
asking us to take on advice-line risk we couldn't bound.

## Where the regulated-advice line is

The brief is explicit that providing personal financial, tax, legal,
or investment advice is a failure condition. Several decisions in the
product exist to keep us on the right side of that line, not as
disclaimers bolted on afterwards.

The five prompts are authored by us and shipped as a fixed array. We
do not generate prompts at runtime. We do not interpret answers. The
prompts ask about feelings, values, history, and lived experience —
never about what someone *should* do with their money — and they do
not contain figures, percentages, products, or tax or legal
terminology. Participants are labelled positionally as *Participant A*
and *Participant B* in the rendered HTML; their identifiers never
leave the server. There are no accounts, no names, and no email
addresses. Sessions live in Cloudflare KV with a twenty-four-hour TTL
and then delete themselves. The footer on every page says all of
this, plainly.

Taken together: the product is a structure for a conversation between
two people. It does not advise either of them. It does not retain
either of them.

## Where we and the other team diverged

A second team has been building from the same brief in parallel and
their product is also live. Both teams converged on the same overall
framing — guided household money conversation, structured prompts, no
sign-up, an explicit advice-line disclaimer in similar words — and
both took the regulated-advice line seriously as a failure condition
rather than a soft preference. That convergence is, on its own, useful
evidence that the framing is sound: two independent readings landed in
the same place.

The interesting divergence is in two of the load-bearing bets
underneath the framing. The other team chose a single-device
side-by-side flow and a saved take-away artefact at the end of the
session. We chose a two-device join-by-URL flow with simultaneous
reveal and an in-browser recap that disappears with the session. Both
readings of the brief are defensible. Theirs leans on the ergonomics
of two people sitting next to each other and on the value of leaving
with something concrete; ours leans on the structural removal of the
go-first asymmetry and on holding as little data as we can. We made
the bet we made because the friction we are trying to address is
specifically the moment one person speaks before the other, and a
single device cannot remove that friction the same way two devices
can. We're holding our line; we expect the other team to hold theirs.
The brief's evaluation is comparative and process-focused, and the
divergence itself is part of what the trail is supposed to show.

## A note on the trail

One small thing worth recording honestly. When the deck mechanic was
first claimed as MVP, the Reviewer flagged that the repo-root README
still pointed at hackathon organisers rather than at Roundtable, which
the brief specifically asks for. The mechanic itself passed; the
README didn't. We added a Roundtable section to the root README,
re-claimed, and the Reviewer passed it. Small, but visible — the
review queue caught a thing the implementation claim had missed, and
the fix is in the commit history rather than rolled silently into a
later change.

## Try it

The deployed product is at
[rivals-team-alpha-product.kevin-wilson.workers.dev](https://rivals-team-alpha-product.kevin-wilson.workers.dev).
Press *Start a session*, send the join URL to whoever you'd usefully
have a money conversation with, and walk the deck of five together.
It takes roughly twenty minutes at a relaxed pace, and twenty-four
hours later there is no record left of either of you having done it.
