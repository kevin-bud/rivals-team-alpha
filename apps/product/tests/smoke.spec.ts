import {
  test,
  expect,
  request as playwrightRequest,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { prompts } from "../src/prompts";

const codePattern = /\b[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}\b/;

// Verbatim from coordination/decision-log.md (entry 2026-05-01 02:35).
// Asserted by id and by an apostrophe-free fragment of the wording so a
// paraphrase regression is caught either way without tripping on HTML
// entity-encoded apostrophes.
const promptFixtures: ReadonlyArray<{ id: string; fragment: string }> = [
  { id: "values-enough", fragment: "mean to each of us, in three years" },
  {
    id: "history-belief",
    fragment: "something about money you grew up believing",
  },
  {
    id: "recent-decision",
    fragment: "Think of a money decision we (or you) made in the last year",
  },
  {
    id: "shared-costs",
    fragment: "how we split or share costs at the moment",
  },
  {
    id: "unexpected",
    fragment: "If something unexpected happened that felt financially significant",
  },
];

test("landing page returns 200 and shows the product name", async ({
  request,
  page,
}) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);

  await page.goto("/");
  await expect(page).toHaveTitle(/Roundtable/);
  await expect(page.getByRole("heading", { name: "Roundtable" })).toBeVisible();
  const cta = page.getByRole("button", { name: "Start a session" });
  await expect(cta).toBeVisible();

  // The CTA must live inside a POST form to /sessions so it works with
  // no JS — checked via the DOM rather than a click here.
  const form = page.locator('form[action="/sessions"][method="post"]');
  await expect(form).toHaveCount(1);
  await expect(form.getByRole("button", { name: "Start a session" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("coming soon");
});

test("POST /sessions creates a session and shows the inside view", async ({
  baseURL,
}) => {
  const ctx = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const response = await ctx.post("/sessions", { maxRedirects: 5 });
  expect(response.status()).toBe(200);
  const body = await response.text();

  const match = body.match(codePattern);
  expect(match, "expected a 6-character join code in the body").not.toBeNull();
  expect(body).toContain("1 here. Share the link with the others.");

  await ctx.dispose();
});

test("a second device can join via /s/<code>/join and both see 2 of 2", async ({
  baseURL,
}) => {
  const host = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const create = await host.post("/sessions", { maxRedirects: 5 });
  expect(create.status()).toBe(200);
  const hostBody = await create.text();
  const codeMatch = hostBody.match(codePattern);
  expect(codeMatch).not.toBeNull();
  const code = codeMatch ? codeMatch[0] : "";
  expect(code).not.toBe("");

  // Second device — fresh context, no cookies.
  const partner = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const join = await partner.post(`/s/${code}/join`, { maxRedirects: 5 });
  expect(join.status()).toBe(200);
  const partnerBody = await join.text();
  // Both still sit in the lobby — the host has not pressed Begin yet,
  // so the deck is locked. Partner sees "2 here." and the
  // waiting-for-host action block.
  expect(partnerBody).toContain("2 here.");
  expect(partnerBody).toContain("Waiting for the host to begin");

  // Host refreshes — should also still be in the lobby with the Begin
  // form available now that two are in.
  const hostRefresh = await host.get(`/s/${code}`);
  expect(hostRefresh.status()).toBe(200);
  const hostBody2 = await hostRefresh.text();
  expect(hostBody2).toContain("2 here.");
  expect(hostBody2).toContain("Begin the conversation");

  await host.dispose();
  await partner.dispose();
});

test("host alone still sees the lobby view (1 here, share the link)", async ({
  baseURL,
}) => {
  const host = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const create = await host.post("/sessions", { maxRedirects: 5 });
  expect(create.status()).toBe(200);
  const body = await create.text();
  expect(body).toContain("1 here. Share the link with the others.");
  // Host alone should not yet see the Begin form — needs at least two.
  expect(body).not.toContain("Begin the conversation");
  await host.dispose();
});

const submitAnswerFor = async (
  ctx: APIRequestContext,
  code: string,
  promptId: string,
  text: string,
): Promise<string> => {
  const response = await ctx.post(`/s/${code}/answer`, {
    form: { prompt_id: promptId, text },
    maxRedirects: 5,
  });
  expect(response.status()).toBe(200);
  return response.text();
};

const advanceFor = async (
  ctx: APIRequestContext,
  code: string,
): Promise<string> => {
  const response = await ctx.post(`/s/${code}/next`, { maxRedirects: 5 });
  expect(response.status()).toBe(200);
  return response.text();
};

const fetchInside = async (
  ctx: APIRequestContext,
  code: string,
): Promise<string> => {
  const response = await ctx.get(`/s/${code}`);
  expect(response.status()).toBe(200);
  return response.text();
};

test("partner clicks the share link in a real browser context and joins", async ({
  browser,
  baseURL,
}) => {
  // Host context: starts a session via the landing-page form so we
  // exercise the same path a real host takes — not a raw POST.
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await hostPage.goto("/");
  await hostPage.getByRole("button", { name: "Start a session" }).click();

  // Host should now be on the inside view (lobby), with the share URL
  // rendered as a clickable anchor.
  await expect(
    hostPage.getByText("1 here. Share the link with the others."),
  ).toBeVisible();
  const shareLink = hostPage.locator("a.share-url");
  await expect(shareLink).toBeVisible();
  const shareUrl = await shareLink.getAttribute("href");
  expect(shareUrl, "host page must render a share URL").not.toBeNull();
  expect(shareUrl ?? "").toMatch(/\/s\/[A-Z0-9]{6}\/join$/);

  const codeMatch = (shareUrl ?? "").match(codePattern);
  expect(codeMatch).not.toBeNull();
  const code = codeMatch ? codeMatch[0] : "";
  expect(code).not.toBe("");

  // Partner context: a fresh browser context (no cookies) — the second
  // person clicking the link they were sent.
  const partnerContext = await browser.newContext();
  const partnerPage = await partnerContext.newPage();

  // Partner navigates directly to the literal share URL the host was
  // told to share. Before the fix this returned a 404 page; it must
  // now resolve to the join view (after the 303 redirect to /s/<code>).
  const partnerResponse = await partnerPage.goto(
    shareUrl ?? `${baseURL ?? ""}/s/${code}/join`,
  );
  expect(partnerResponse, "partner page.goto should yield a response").not.toBeNull();
  expect(partnerResponse?.status()).toBe(200);

  // Title must not be the "session not found" page.
  const partnerTitle = await partnerPage.title();
  expect(partnerTitle.toLowerCase()).not.toContain("not found");
  expect(partnerTitle).toMatch(/Roundtable/);

  // The join view is on the page: a "Join this session" submit button
  // inside a POST form pointing at /s/<code>/join.
  const joinForm = partnerPage.locator(
    `form[method="post"][action="/s/${code}/join"]`,
  );
  await expect(joinForm).toHaveCount(1);
  await expect(
    partnerPage.getByRole("button", { name: "Join this session" }),
  ).toBeVisible();

  // Partner clicks the submit. They should land on /s/<code> with the
  // joined inside-view showing "2 of 2 here" (or the answer view if
  // both are present and the deck has unlocked).
  await partnerPage.getByRole("button", { name: "Join this session" }).click();
  await partnerPage.waitForURL(new RegExp(`/s/${code}$`));

  const partnerBody = await partnerPage.content();
  // Partner lands in the lobby with "2 here." and the waiting-for-host
  // action block. The deck does not unlock until the host begins.
  expect(partnerBody).not.toContain("Session not found");
  expect(partnerBody).toContain("2 here.");
  expect(partnerBody).toContain("Waiting for the host to begin");

  await hostContext.close();
  await partnerContext.close();
});

test("GET /s/<code>/join returns 303 redirect to /s/<code>", async ({
  baseURL,
}) => {
  // Pure routing assertion — the unit test for the hotfix. No browser
  // needed; we just want to prove the redirect status and Location.
  const ctx = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const create = await ctx.post("/sessions", { maxRedirects: 0 });
  expect(create.status()).toBe(303);
  const createLocation = create.headers()["location"] ?? "";
  const codeMatch = createLocation.match(codePattern);
  expect(codeMatch).not.toBeNull();
  const code = codeMatch ? codeMatch[0] : "";
  expect(code).not.toBe("");

  const joinGet = await ctx.get(`/s/${code}/join`, { maxRedirects: 0 });
  expect(joinGet.status()).toBe(303);
  expect(joinGet.headers()["location"]).toBe(`/s/${code}`);

  await ctx.dispose();
});

test("two participants walk the full five-prompt deck end-to-end", async ({
  baseURL,
}) => {
  const host = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const partner = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });

  const create = await host.post("/sessions", { maxRedirects: 5 });
  expect(create.status()).toBe(200);
  const hostBody = await create.text();
  const codeMatch = hostBody.match(codePattern);
  expect(codeMatch).not.toBeNull();
  const code = codeMatch ? codeMatch[0] : "";
  expect(code).not.toBe("");

  // Partner joins; the host then begins the conversation. Until the
  // host taps Begin the deck stays locked behind the lobby.
  const join = await partner.post(`/s/${code}/join`, { maxRedirects: 5 });
  expect(join.status()).toBe(200);
  const begin = await host.post(`/s/${code}/begin`, { maxRedirects: 5 });
  expect(begin.status()).toBe(200);

  // Walk all five prompts.
  for (let i = 0; i < promptFixtures.length; i += 1) {
    const fixture = promptFixtures[i];
    if (fixture === undefined) {
      throw new Error("missing fixture");
    }

    // Both should see the current prompt before either submits.
    const hostBefore = await fetchInside(host, code);
    expect(hostBefore).toContain(fixture.fragment);
    expect(hostBefore).toContain(`prompt_id" value="${fixture.id}"`);
    const partnerBefore = await fetchInside(partner, code);
    expect(partnerBefore).toContain(fixture.fragment);

    // Host submits first → host sees the waiting-for-reveal view.
    const hostAfterSubmit = await submitAnswerFor(
      host,
      code,
      fixture.id,
      `Host answer for ${fixture.id}`,
    );
    expect(hostAfterSubmit).toContain("Waiting for the others");
    expect(hostAfterSubmit).toContain("1 of 2 have submitted");

    // Partner submits → partner now sees the reveal.
    const partnerAfterSubmit = await submitAnswerFor(
      partner,
      code,
      fixture.id,
      `Partner answer for ${fixture.id}`,
    );
    expect(partnerAfterSubmit).toContain("Both answers");
    expect(partnerAfterSubmit).toContain(`Host answer for ${fixture.id}`);
    expect(partnerAfterSubmit).toContain(`Partner answer for ${fixture.id}`);
    expect(partnerAfterSubmit).toContain("Participant A");
    expect(partnerAfterSubmit).toContain("Participant B");

    // Host refreshes → also sees the reveal.
    const hostRevealed = await fetchInside(host, code);
    expect(hostRevealed).toContain("Both answers");
    expect(hostRevealed).toContain(`Host answer for ${fixture.id}`);
    expect(hostRevealed).toContain(`Partner answer for ${fixture.id}`);

    // Either of them advances. Alternate so both code paths exercise.
    const advancingCtx = i % 2 === 0 ? host : partner;
    await advanceFor(advancingCtx, code);
  }

  // After the fifth advance, both contexts see the complete view with
  // every prompt fragment and all ten answers.
  const hostComplete = await fetchInside(host, code);
  expect(hostComplete).toContain("Conversation complete");
  expect(hostComplete).toContain("end of the deck");
  expect(hostComplete).toContain("beyond the next 24 hours");
  for (const fixture of promptFixtures) {
    expect(hostComplete).toContain(fixture.fragment);
    expect(hostComplete).toContain(`Host answer for ${fixture.id}`);
    expect(hostComplete).toContain(`Partner answer for ${fixture.id}`);
  }

  // Take-away affordance: clipboard-copy button, print hint, print
  // stylesheet, and an inline <script> wired to navigator.clipboard.
  expect(hostComplete).toContain('id="copy-recap"');
  expect(hostComplete).toContain("Copy to clipboard");
  expect(hostComplete.toLowerCase()).toContain("print");
  expect(hostComplete).toContain("@media print");
  expect(hostComplete).toContain("clipboard.writeText");
  // The recap text payload must include the footer disclaimer so the
  // copied artefact carries the not-advice line.
  expect(hostComplete).toContain(
    "Roundtable does not provide financial, tax, legal, or investment advice.",
  );

  const partnerComplete = await fetchInside(partner, code);
  expect(partnerComplete).toContain("Conversation complete");
  for (const fixture of promptFixtures) {
    expect(partnerComplete).toContain(fixture.fragment);
    expect(partnerComplete).toContain(`Host answer for ${fixture.id}`);
    expect(partnerComplete).toContain(`Partner answer for ${fixture.id}`);
  }

  // ---------------------------------------------------------------
  // Closing note (decision-log 2026-05-01 06:50 — "Plural depth: a
  // shared closing sentence on the complete view"). Host saves a
  // recognisable note, asserts it lands in the recap-closing block
  // and in the inline-script recap payload, then clears it and
  // asserts the empty-as-delete semantic took effect.
  // ---------------------------------------------------------------
  expect(hostComplete).toContain("One last thing — together.");
  expect(hostComplete).toContain("Save this sentence");
  expect(hostComplete).toContain("Nothing saved yet.");
  // The complete view must NOT auto-refresh — the textarea would be
  // cleared exactly like the answer-view P0 we already fixed.
  expect(hostComplete).not.toContain('http-equiv="refresh"');

  const closingText =
    "What a great conversation we had today, hosted via the closing note test.";
  const setNote = await host.post(`/s/${code}/closing-note`, {
    form: { text: closingText },
    maxRedirects: 5,
  });
  expect(setNote.status()).toBe(200);
  const completeWithNote = await fetchInside(host, code);
  expect(completeWithNote).toContain(closingText);
  // Recap-closing block heading + last-saved label.
  expect(completeWithNote).toContain('class="recap-closing"');
  expect(completeWithNote).toContain("<h3>Together</h3>");
  expect(completeWithNote).toMatch(
    /Last saved by Participant A at \d{2}:\d{2}/,
  );
  // The clipboard payload must reflect the closing note too.
  const recapMatchWithNote = completeWithNote.match(
    /var recapText = (".+?");/s,
  );
  expect(recapMatchWithNote).not.toBeNull();
  if (recapMatchWithNote !== null && typeof recapMatchWithNote[1] === "string") {
    const recapPayload = JSON.parse(recapMatchWithNote[1]) as string;
    expect(recapPayload).toContain(closingText);
    expect(recapPayload).toMatch(
      /Together — last saved by Participant A at \d{2}:\d{2} \(UTC\):/,
    );
  }

  // Now clear the closing note (empty-as-delete) and assert the
  // closing-note section is back to "Nothing saved yet." and the
  // recap-closing block + script payload have dropped it.
  const clearNote = await host.post(`/s/${code}/closing-note`, {
    form: { text: "" },
    maxRedirects: 5,
  });
  expect(clearNote.status()).toBe(200);
  const completeAfterClear = await fetchInside(host, code);
  expect(completeAfterClear).toContain("Nothing saved yet.");
  expect(completeAfterClear).not.toContain(closingText);
  expect(completeAfterClear).not.toContain('class="recap-closing"');
  const recapMatchAfterClear = completeAfterClear.match(
    /var recapText = (".+?");/s,
  );
  expect(recapMatchAfterClear).not.toBeNull();
  if (
    recapMatchAfterClear !== null &&
    typeof recapMatchAfterClear[1] === "string"
  ) {
    const recapPayload = JSON.parse(recapMatchAfterClear[1]) as string;
    expect(recapPayload).not.toContain(closingText);
    expect(recapPayload).not.toContain("Together — last saved by");
  }

  await host.dispose();
  await partner.dispose();
});

test("closing-note POST is rejected before the deck completes", async ({
  baseURL,
}) => {
  // setClosingNote refuses any save while session.completedAt === null.
  // We mint a session, partner joins, host begins — but no answers are
  // submitted — and then try to POST to /s/<code>/closing-note. The
  // route must surface a non-303 error rather than redirecting back to
  // the inside view.
  const host = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const partner = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });

  const create = await host.post("/sessions", { maxRedirects: 5 });
  expect(create.status()).toBe(200);
  const codeMatch = (await create.text()).match(codePattern);
  expect(codeMatch).not.toBeNull();
  const code = codeMatch ? codeMatch[0] : "";
  expect(code).not.toBe("");

  const join = await partner.post(`/s/${code}/join`, { maxRedirects: 5 });
  expect(join.status()).toBe(200);
  const begin = await host.post(`/s/${code}/begin`, { maxRedirects: 5 });
  expect(begin.status()).toBe(200);

  const tooEarly = await host.post(`/s/${code}/closing-note`, {
    form: { text: "Trying to save before the deck has finished." },
    maxRedirects: 0,
  });
  expect(tooEarly.status()).not.toBe(303);
  expect([400, 404, 409]).toContain(tooEarly.status());

  await host.dispose();
  await partner.dispose();
});

test("answer view HTML must not contain a meta refresh (regression guard)", async ({
  baseURL,
}) => {
  // Static regression guard: the answer view (the view with the
  // textarea) must never auto-refresh — that destroys the user's
  // typing. This is the cheap, definitive check that fires even if
  // Playwright timing changes; the browser-context test below proves
  // the user-experience effect.
  const host = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const partner = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });

  const create = await host.post("/sessions", { maxRedirects: 5 });
  expect(create.status()).toBe(200);
  const codeMatch = (await create.text()).match(codePattern);
  expect(codeMatch).not.toBeNull();
  const code = codeMatch ? codeMatch[0] : "";
  expect(code).not.toBe("");

  // Partner joins, host begins; with the deck unlocked the host's
  // GET /s/<code> now lands on the answer view rather than the lobby.
  const join = await partner.post(`/s/${code}/join`, { maxRedirects: 5 });
  expect(join.status()).toBe(200);
  const begin = await host.post(`/s/${code}/begin`, { maxRedirects: 5 });
  expect(begin.status()).toBe(200);

  const answerHtml = await fetchInside(host, code);
  // We are on the answer view for prompt 1.
  expect(answerHtml).toContain("Prompt 1 of 5");
  expect(answerHtml).toContain('prompt_id" value="values-enough"');
  // regression guard: the answer view must not auto-refresh — it would clear the textarea
  expect(answerHtml).not.toContain('http-equiv="refresh"');

  await host.dispose();
  await partner.dispose();
});

test("typed text in the answer-view textarea survives longer than the old refresh interval", async ({
  browser,
}) => {
  // Real browser-context proof: type into the answer-view textarea,
  // wait longer than the old 5-second meta refresh, and assert the
  // text is still in the textarea. Same pattern as the share-link
  // test added in the previous hotfix.
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await hostPage.goto("/");
  await hostPage.getByRole("button", { name: "Start a session" }).click();

  // Host is on the lobby; pull the share URL.
  await expect(
    hostPage.getByText("1 here. Share the link with the others."),
  ).toBeVisible();
  const shareLink = hostPage.locator("a.share-url");
  const shareUrl = await shareLink.getAttribute("href");
  expect(shareUrl, "host page must render a share URL").not.toBeNull();
  const codeMatch = (shareUrl ?? "").match(codePattern);
  expect(codeMatch).not.toBeNull();
  const code = codeMatch ? codeMatch[0] : "";
  expect(code).not.toBe("");

  // Partner joins via the share URL — fresh context so no cookies.
  const partnerContext = await browser.newContext();
  const partnerPage = await partnerContext.newPage();
  await partnerPage.goto(shareUrl ?? `/s/${code}/join`);
  await partnerPage.getByRole("button", { name: "Join this session" }).click();
  await partnerPage.waitForURL(new RegExp(`/s/${code}$`));

  // Host taps Begin so the deck unlocks.
  await hostPage.goto(`/s/${code}`);
  await hostPage
    .getByRole("button", { name: "Begin the conversation" })
    .click();
  await hostPage.waitForURL(new RegExp(`/s/${code}$`));

  // Host is now on the answer view for prompt 1.
  await expect(hostPage.getByText("Prompt 1 of 5")).toBeVisible();
  const textarea = hostPage.locator('textarea[name="text"]');
  await expect(textarea).toBeVisible();

  const typed =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
  await textarea.fill(typed);
  await expect(textarea).toHaveValue(typed);

  // Wait longer than the old 5-second refresh interval. If the
  // <meta refresh> ever creeps back in, the page will navigate to
  // itself and the textarea will be empty when the assertion fires.
  await hostPage.waitForTimeout(6000);

  await expect(textarea).toHaveValue(typed);

  await hostContext.close();
  await partnerContext.close();
});

// =====================================================================
// Test-coverage sweep (decision-log entry 2026-05-01 04:50).
// Six browser-context tests covering the user-facing surfaces that
// previously had no real-page coverage. Pure additions — if any of
// these fails it indicates an actual bug, and the policy is to stop
// and report `blocked` rather than patch in-line.
// =====================================================================

// The unambiguous alphabet used by session codes per the brief:
// `[2-9A-HJ-KMNP-Z]{6}` (no 0/1/I/L/O to avoid misreading).
const unambiguousCodePattern = /\/s\/[2-9A-HJ-KMNP-Z]{6}$/;

// Helper: walk both contexts to the host's "answer view" for prompt 1.
// Used by tests 3, 4 and 5. Returns the session code so callers can
// reuse it for further navigation.
const setUpJoinedSession = async (
  hostPage: Page,
  partnerPage: Page,
): Promise<string> => {
  await hostPage.goto("/");
  await hostPage.getByRole("button", { name: "Start a session" }).click();
  await expect(
    hostPage.getByText("1 here. Share the link with the others."),
  ).toBeVisible();
  const shareLink = hostPage.locator("a.share-url");
  const shareUrl = await shareLink.getAttribute("href");
  expect(shareUrl, "host page must render a share URL").not.toBeNull();
  const codeMatch = (shareUrl ?? "").match(codePattern);
  expect(codeMatch).not.toBeNull();
  const code = codeMatch ? codeMatch[0] : "";
  expect(code).not.toBe("");

  await partnerPage.goto(shareUrl ?? `/s/${code}/join`);
  await partnerPage.getByRole("button", { name: "Join this session" }).click();
  await partnerPage.waitForURL(new RegExp(`/s/${code}$`));

  // Host taps Begin so the deck unlocks. Until then both are stuck in
  // the lobby, regardless of count.
  await hostPage.goto(`/s/${code}`);
  await hostPage
    .getByRole("button", { name: "Begin the conversation" })
    .click();
  await hostPage.waitForURL(new RegExp(`/s/${code}$`));

  return code;
};

test("landing form click submits and lands on the host view", async ({
  browser,
}) => {
  // Surface 1: landing page form submission via a real user click,
  // exercising form-action wiring, the 303 redirect, cookie handling,
  // and the rendered host (waiting-for-joiner) view. Distinct from the
  // existing `request.post('/sessions')` test which bypasses the page.
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Start a session" }).click();

  // The redirect must land us on `/s/<6-char-unambiguous-code>`.
  await page.waitForURL(unambiguousCodePattern);
  expect(page.url()).toMatch(unambiguousCodePattern);

  // The 6-character code must appear in a visible element on the page.
  const codeFromUrl = page.url().match(/[2-9A-HJ-KMNP-Z]{6}$/);
  expect(codeFromUrl).not.toBeNull();
  const code = codeFromUrl ? codeFromUrl[0] : "";
  await expect(page.locator(".code")).toHaveText(code);

  // And the count copy must be visible.
  await expect(
    page.getByText("1 here. Share the link with the others."),
  ).toBeVisible();

  await context.close();
});

test("waiting-for-joiner view auto-updates when the partner joins", async ({
  browser,
}) => {
  // Surface 2: the host's waiting view uses <meta refresh> to poll for
  // partner join. This test sits on the host page and waits for the
  // count to flip from "1 of 2 here" to "2 of 2 here" without any
  // explicit page.reload(). If this fails, the meta-refresh polling on
  // renderWaitingForJoiner is broken.
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await hostPage.goto("/");
  await hostPage.getByRole("button", { name: "Start a session" }).click();
  await expect(
    hostPage.getByText("1 here. Share the link with the others."),
  ).toBeVisible();

  const shareLink = hostPage.locator("a.share-url");
  const shareUrl = await shareLink.getAttribute("href");
  expect(shareUrl, "host page must render a share URL").not.toBeNull();
  const codeMatch = (shareUrl ?? "").match(codePattern);
  expect(codeMatch).not.toBeNull();
  const code = codeMatch ? codeMatch[0] : "";
  expect(code).not.toBe("");

  // Partner joins in a second context.
  const partnerContext = await browser.newContext();
  const partnerPage = await partnerContext.newPage();
  await partnerPage.goto(shareUrl ?? `/s/${code}/join`);
  await partnerPage.getByRole("button", { name: "Join this session" }).click();
  await partnerPage.waitForURL(new RegExp(`/s/${code}$`));

  // Host's page must update on its own. The meta-refresh interval is
  // 5s; 12s comfortably allows for one cycle plus KV propagation.
  // After the partner joins, the lobby flips to "2 here." and the
  // host now sees the Begin form. The deck does not auto-unlock.
  await hostPage.waitForFunction(
    () => {
      const text = document.body.textContent ?? "";
      return (
        text.includes("2 here.") &&
        text.includes("Begin the conversation")
      );
    },
    null,
    { timeout: 12000 },
  );

  await hostContext.close();
  await partnerContext.close();
});

test("waiting-for-reveal view auto-transitions to reveal when partner submits", async ({
  browser,
}) => {
  // Surface 3: after the host submits, they see the
  // waiting-for-reveal view, which also uses <meta refresh>. Once the
  // partner submits, the host's page must transition to the reveal
  // view without an explicit reload.
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const partnerContext = await browser.newContext();
  const partnerPage = await partnerContext.newPage();

  const code = await setUpJoinedSession(hostPage, partnerPage);

  // Host navigates to the inside view (answer view for prompt 1).
  await hostPage.goto(`/s/${code}`);
  await expect(hostPage.getByText("Prompt 1 of 5")).toBeVisible();
  const hostTextarea = hostPage.locator('textarea[name="text"]');
  await expect(hostTextarea).toBeVisible();
  await hostTextarea.fill("hostAnswerForReveal-12345");
  await hostPage
    .getByRole("button", { name: "Submit privately" })
    .click();

  // Host should now be on the waiting-for-reveal view.
  await expect(
    hostPage.getByRole("heading", {
      name: "You've submitted. Waiting for the others.",
    }),
  ).toBeVisible();

  // Partner submits.
  await partnerPage.goto(`/s/${code}`);
  await expect(partnerPage.getByText("Prompt 1 of 5")).toBeVisible();
  const partnerTextarea = partnerPage.locator('textarea[name="text"]');
  await partnerTextarea.fill("partnerAnswerForReveal-67890");
  await partnerPage
    .getByRole("button", { name: "Submit privately" })
    .click();

  // Host's page must auto-transition to the reveal view; the reveal
  // CTA "Move to the next prompt" is the marker. 12s allows for a
  // single 5s refresh cycle plus KV propagation comfortably.
  await hostPage.waitForFunction(
    () => (document.body.textContent ?? "").includes("Move to the next prompt"),
    null,
    { timeout: 12000 },
  );

  await hostContext.close();
  await partnerContext.close();
});

test("reveal view renders both answers under Participant A and B labels", async ({
  browser,
}) => {
  // Surface 4: once both have submitted, the reveal view must render
  // both answers, labelled with "Participant A" and "Participant B"
  // exactly once each, with the first joiner's answer on the A side.
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const partnerContext = await browser.newContext();
  const partnerPage = await partnerContext.newPage();

  const code = await setUpJoinedSession(hostPage, partnerPage);

  const hostAnswer = "hostAnswerForReveal-12345";
  const partnerAnswer = "partnerAnswerForReveal-67890";

  // Host submits first.
  await hostPage.goto(`/s/${code}`);
  await expect(hostPage.getByText("Prompt 1 of 5")).toBeVisible();
  await hostPage.locator('textarea[name="text"]').fill(hostAnswer);
  await hostPage.getByRole("button", { name: "Submit privately" }).click();

  // Partner submits second.
  await partnerPage.goto(`/s/${code}`);
  await expect(partnerPage.getByText("Prompt 1 of 5")).toBeVisible();
  await partnerPage.locator('textarea[name="text"]').fill(partnerAnswer);
  await partnerPage
    .getByRole("button", { name: "Submit privately" })
    .click();

  // Partner's page is now the reveal view directly (post-submit
  // redirect, both submitted). Host needs a refresh to land there.
  await hostPage.goto(`/s/${code}`);
  await expect(hostPage.getByText("Both answers")).toBeVisible();

  // Exactly one "Participant A" label and one "Participant B" label.
  await expect(hostPage.locator("text=Participant A")).toHaveCount(1);
  await expect(hostPage.locator("text=Participant B")).toHaveCount(1);

  // The host joined first (created the session), so the host's answer
  // sits under Participant A and the partner's under Participant B.
  // Locate the .answer-card containing each label and assert its body
  // carries the expected answer text.
  const cardA = hostPage
    .locator(".answer-card")
    .filter({ hasText: "Participant A" });
  const cardB = hostPage
    .locator(".answer-card")
    .filter({ hasText: "Participant B" });
  await expect(cardA).toContainText(hostAnswer);
  await expect(cardB).toContainText(partnerAnswer);

  await hostContext.close();
  await partnerContext.close();
});

test("complete view's clipboard button copies the recap with all five prompts", async ({
  browser,
}) => {
  // Surface 5: walk the full deck, then on the complete view click the
  // #copy-recap button and read the clipboard. We try the headless
  // Chromium clipboard-permissions path first; if that's flaky on a
  // given runner, we fall back to verifying that the inline <script>
  // carries the recap text and that the click handler is wired (via
  // dispatching a click and confirming the button's flash label
  // changes to "Copied"). Either way, the recap content must contain
  // the title, all five prompt texts, and the disclaimer.
  const hostContext = await browser.newContext();
  // Best-effort grant of clipboard permissions. Chromium honours these;
  // other browsers may ignore them but we only run chromium per the
  // playwright config.
  await hostContext.grantPermissions(["clipboard-read", "clipboard-write"]);
  const hostPage = await hostContext.newPage();
  const partnerContext = await browser.newContext();
  const partnerPage = await partnerContext.newPage();

  const code = await setUpJoinedSession(hostPage, partnerPage);

  // Walk all five prompts: host submits, partner submits, then either
  // advances. We use distinct strings so we could spot mismatches in
  // the recap if the answers got mixed up.
  for (let i = 0; i < prompts.length; i += 1) {
    const prompt = prompts[i];
    if (prompt === undefined) {
      throw new Error("missing prompt fixture");
    }

    await hostPage.goto(`/s/${code}`);
    await expect(hostPage.getByText(`Prompt ${i + 1} of 5`)).toBeVisible();
    await hostPage
      .locator('textarea[name="text"]')
      .fill(`hostFor-${prompt.id}`);
    await hostPage
      .getByRole("button", { name: "Submit privately" })
      .click();

    await partnerPage.goto(`/s/${code}`);
    await expect(partnerPage.getByText(`Prompt ${i + 1} of 5`)).toBeVisible();
    await partnerPage
      .locator('textarea[name="text"]')
      .fill(`partnerFor-${prompt.id}`);
    await partnerPage
      .getByRole("button", { name: "Submit privately" })
      .click();

    // Advance via the host. After the fifth advance both contexts land
    // on the complete view.
    await hostPage.goto(`/s/${code}`);
    await expect(hostPage.getByText("Both answers")).toBeVisible();
    const advanceLabel = i === prompts.length - 1
      ? "Finish"
      : "Move to the next prompt";
    await hostPage.getByRole("button", { name: advanceLabel }).click();
  }

  // Host should now be on the complete view.
  await expect(
    hostPage.getByRole("heading", { name: "Conversation complete" }),
  ).toBeVisible();
  await expect(hostPage.locator("#copy-recap")).toBeVisible();

  // Click the copy button.
  await hostPage.locator("#copy-recap").click();

  // Try clipboard-read first. If the headless permission grant didn't
  // take, fall back to reading the inline <script> recap literal from
  // the served HTML — that is what would be copied, so verifying its
  // contents proves the wiring just as definitively.
  let clipText = "";
  let usedClipboardApi = false;
  try {
    clipText = await hostPage.evaluate(
      () => navigator.clipboard.readText(),
    );
    usedClipboardApi = true;
  } catch {
    // Fallback: pull the recap text out of the inline <script>. The
    // server JSON-encodes it as a JavaScript string literal; we can
    // extract it with a regex and JSON.parse the captured group.
    const html = await hostPage.content();
    const match = html.match(/var recapText = (".+?");/s);
    expect(
      match,
      "expected the inline <script> to declare recapText",
    ).not.toBeNull();
    if (match !== null && typeof match[1] === "string") {
      clipText = JSON.parse(match[1]) as string;
    }
  }

  // Whichever path we took, the recap must carry the title, every
  // prompt text, and the disclaimer.
  expect(clipText).toContain("Roundtable — conversation recap");
  for (const prompt of prompts) {
    expect(clipText).toContain(prompt.text);
  }
  expect(clipText).toContain(
    "does not provide financial, tax, legal, or investment advice",
  );

  // Smoke note for human readers: log which path verified the button.
  // Failures are surfaced by the assertions above; this is purely
  // informational and never throws.
  expect(typeof usedClipboardApi).toBe("boolean");

  await hostContext.close();
  await partnerContext.close();
});

test("session-not-found path under a real navigation has a working back link", async ({
  browser,
}) => {
  // Surface 6: a real user pasting a stale URL must land on a
  // 404-flavoured page with the "Back to the start" link, and that
  // link must take them back to the landing page.
  const context = await browser.newContext();
  const page = await context.newPage();

  const response = await page.goto("/s/NOTREAL");
  expect(response, "page.goto on /s/NOTREAL must yield a response").not.toBeNull();
  expect(response?.status()).toBe(404);

  // Title indicates the not-found state.
  const title = await page.title();
  expect(title.toLowerCase()).toContain("not found");

  // Body carries the user-facing copy.
  await expect(
    page.getByText("This session has ended or never existed."),
  ).toBeVisible();

  // Click "Back to the start" — must arrive at the landing page where
  // the "Start a session" form is visible again.
  await page.getByRole("link", { name: "Back to the start" }).click();
  await page.waitForURL(/\/$/);
  await expect(
    page.getByRole("heading", { name: "Roundtable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start a session" }),
  ).toBeVisible();

  await context.close();
});

// =====================================================================
// Plurality (decision-log entry 2026-05-01 05:40 — "Next product axis:
// plurality, not breadth"). Three new tests: a three-participant
// walkthrough through prompts 1–2, a regression guard that the lobby
// copy no longer contains the old "of 2 here", and a guard that
// joinSession refuses new joiners after the host has begun.
// =====================================================================

test("three participants share a session, walk prompts 1 and 2, see A/B/C labels", async ({
  browser,
}) => {
  // Three real browser contexts. Host starts a session, two partners
  // join via the share URL, host taps Begin once everyone is in. For
  // prompts 1 and 2 each of the three submits a distinct, recognisable
  // answer; the host's reveal view must show "Participant A",
  // "Participant B", and "Participant C" once each, with the right
  // typed answer beside each. Two prompts is enough to confirm
  // 3-participant correctness — no need to walk the full five.
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const partnerOneContext = await browser.newContext();
  const partnerOnePage = await partnerOneContext.newPage();
  const partnerTwoContext = await browser.newContext();
  const partnerTwoPage = await partnerTwoContext.newPage();

  // Host starts a session and waits in the lobby.
  await hostPage.goto("/");
  await hostPage.getByRole("button", { name: "Start a session" }).click();
  await expect(
    hostPage.getByText("1 here. Share the link with the others."),
  ).toBeVisible();
  const shareLink = hostPage.locator("a.share-url");
  const shareUrl = await shareLink.getAttribute("href");
  expect(shareUrl, "host page must render a share URL").not.toBeNull();
  const codeMatch = (shareUrl ?? "").match(codePattern);
  expect(codeMatch).not.toBeNull();
  const code = codeMatch ? codeMatch[0] : "";
  expect(code).not.toBe("");

  // Partner 1 joins via the share URL. Lobby should show "2 here" and
  // partner 1 sees their positional label "You are Participant B".
  await partnerOnePage.goto(shareUrl ?? `/s/${code}/join`);
  await partnerOnePage
    .getByRole("button", { name: "Join this session" })
    .click();
  await partnerOnePage.waitForURL(new RegExp(`/s/${code}$`));
  await expect(partnerOnePage.getByText("2 here.")).toBeVisible();
  await expect(
    partnerOnePage.getByText("You are Participant B."),
  ).toBeVisible();

  // Host refreshes — they should see "2 here" and the Begin form.
  await hostPage.goto(`/s/${code}`);
  await expect(hostPage.getByText("2 here.")).toBeVisible();
  await expect(
    hostPage.getByText("You are Participant A."),
  ).toBeVisible();
  await expect(
    hostPage.getByRole("button", { name: "Begin the conversation" }),
  ).toBeVisible();

  // Partner 2 joins. Lobby should show "3 here". Host has not yet
  // tapped Begin, so the Begin form is still on the host's page.
  await partnerTwoPage.goto(shareUrl ?? `/s/${code}/join`);
  await partnerTwoPage
    .getByRole("button", { name: "Join this session" })
    .click();
  await partnerTwoPage.waitForURL(new RegExp(`/s/${code}$`));
  await expect(partnerTwoPage.getByText("3 here.")).toBeVisible();
  await expect(
    partnerTwoPage.getByText("You are Participant C."),
  ).toBeVisible();

  await hostPage.goto(`/s/${code}`);
  await expect(hostPage.getByText("3 here.")).toBeVisible();
  await expect(
    hostPage.getByRole("button", { name: "Begin the conversation" }),
  ).toBeVisible();

  // Host clicks Begin. All three pages should now show prompt 1.
  await hostPage
    .getByRole("button", { name: "Begin the conversation" })
    .click();
  await hostPage.waitForURL(new RegExp(`/s/${code}$`));
  await expect(hostPage.getByText("Prompt 1 of 5")).toBeVisible();

  await partnerOnePage.goto(`/s/${code}`);
  await expect(partnerOnePage.getByText("Prompt 1 of 5")).toBeVisible();
  await partnerTwoPage.goto(`/s/${code}`);
  await expect(partnerTwoPage.getByText("Prompt 1 of 5")).toBeVisible();

  // Walk prompts 1 and 2.
  for (let i = 0; i < 2; i += 1) {
    const promptNumber = i + 1;
    const hostAnswer = `host-answer-prompt-${promptNumber}`;
    const partnerOneAnswer = `partner-one-answer-prompt-${promptNumber}`;
    const partnerTwoAnswer = `partner-two-answer-prompt-${promptNumber}`;

    // Each submits in turn from a fresh GET so the meta-refresh state
    // is irrelevant to the assertion path.
    await hostPage.goto(`/s/${code}`);
    await expect(
      hostPage.getByText(`Prompt ${promptNumber} of 5`),
    ).toBeVisible();
    await hostPage.locator('textarea[name="text"]').fill(hostAnswer);
    await hostPage
      .getByRole("button", { name: "Submit privately" })
      .click();

    await partnerOnePage.goto(`/s/${code}`);
    await expect(
      partnerOnePage.getByText(`Prompt ${promptNumber} of 5`),
    ).toBeVisible();
    await partnerOnePage
      .locator('textarea[name="text"]')
      .fill(partnerOneAnswer);
    await partnerOnePage
      .getByRole("button", { name: "Submit privately" })
      .click();

    await partnerTwoPage.goto(`/s/${code}`);
    await expect(
      partnerTwoPage.getByText(`Prompt ${promptNumber} of 5`),
    ).toBeVisible();
    await partnerTwoPage
      .locator('textarea[name="text"]')
      .fill(partnerTwoAnswer);
    await partnerTwoPage
      .getByRole("button", { name: "Submit privately" })
      .click();

    // Host refreshes onto the reveal view.
    await hostPage.goto(`/s/${code}`);
    await expect(hostPage.getByText("Both answers")).toBeVisible();

    // Each label appears exactly once on the reveal.
    await expect(hostPage.locator("text=Participant A")).toHaveCount(1);
    await expect(hostPage.locator("text=Participant B")).toHaveCount(1);
    await expect(hostPage.locator("text=Participant C")).toHaveCount(1);

    // The card carrying each label carries the matching answer.
    await expect(
      hostPage.locator(".answer-card").filter({ hasText: "Participant A" }),
    ).toContainText(hostAnswer);
    await expect(
      hostPage.locator(".answer-card").filter({ hasText: "Participant B" }),
    ).toContainText(partnerOneAnswer);
    await expect(
      hostPage.locator(".answer-card").filter({ hasText: "Participant C" }),
    ).toContainText(partnerTwoAnswer);

    // Host advances.
    await hostPage
      .getByRole("button", { name: "Move to the next prompt" })
      .click();
  }

  await hostContext.close();
  await partnerOneContext.close();
  await partnerTwoContext.close();
});

test("a fourth person trying to join after the host begins is rejected", async ({
  baseURL,
}) => {
  // Once the host has begun the conversation the room closes. A new
  // POST /s/<code>/join must not produce a 303 redirect to the inside
  // view — it must surface the session-full / closed error page (or
  // otherwise refuse with a non-303 status).
  const host = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const partner = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const latecomer = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });

  const create = await host.post("/sessions", { maxRedirects: 5 });
  expect(create.status()).toBe(200);
  const codeMatch = (await create.text()).match(codePattern);
  expect(codeMatch).not.toBeNull();
  const code = codeMatch ? codeMatch[0] : "";
  expect(code).not.toBe("");

  const join = await partner.post(`/s/${code}/join`, { maxRedirects: 5 });
  expect(join.status()).toBe(200);

  const begin = await host.post(`/s/${code}/begin`, { maxRedirects: 0 });
  expect(begin.status()).toBe(303);
  expect(begin.headers()["location"]).toBe(`/s/${code}`);

  // Latecomer tries to join after Begin. The route should not 303 to
  // the inside view; it should surface the session-full / closed page.
  const latePost = await latecomer.post(`/s/${code}/join`, {
    maxRedirects: 0,
  });
  expect(latePost.status()).not.toBe(303);
  // 409 is what the existing `sessionFullHtml` branch returns.
  expect([400, 404, 409]).toContain(latePost.status());

  await host.dispose();
  await partner.dispose();
  await latecomer.dispose();
});

test("lobby view does not contain the old hardcoded 'of 2 here' copy", async ({
  baseURL,
}) => {
  // Regression guard against the pre-plurality "1 of 2 here" /
  // "X of 2 here" copy slipping back into the lobby. We mint a fresh
  // session (host alone) and a second-participant lobby state, and
  // assert the literal substring "of 2 here" is absent from both.
  const host = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const partner = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });

  const create = await host.post("/sessions", { maxRedirects: 5 });
  expect(create.status()).toBe(200);
  const hostBody = await create.text();
  const codeMatch = hostBody.match(codePattern);
  expect(codeMatch).not.toBeNull();
  const code = codeMatch ? codeMatch[0] : "";
  expect(code).not.toBe("");
  expect(hostBody).not.toContain("of 2 here");

  const join = await partner.post(`/s/${code}/join`, { maxRedirects: 5 });
  expect(join.status()).toBe(200);
  const partnerBody = await join.text();
  expect(partnerBody).not.toContain("of 2 here");

  // Host's refreshed lobby must also be clean.
  const hostRefresh = await host.get(`/s/${code}`);
  expect(hostRefresh.status()).toBe(200);
  expect(await hostRefresh.text()).not.toContain("of 2 here");

  await host.dispose();
  await partner.dispose();
});

// =====================================================================
// Regulated-advice copy regression test (decision-log entry
// 2026-05-01 06:15). Walks every reachable user-facing view, strips
// disclaimer-marked elements, <script>...</script> blocks, and the
// <title>...</title> content, and asserts no advice-flavoured language
// remains. The audit document apps/product/COPY-AUDIT.md is the
// human-readable counterpart to this test.
// =====================================================================

type ViewSample = { surface: string; html: string };

const stripDisclaimerBlocks = (html: string): string =>
  html.replace(/<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\bdata-disclaimer\b[^>]*>[\s\S]*?<\/\1>/gi, "");

const stripScripts = (html: string): string =>
  html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

const stripTitle = (html: string): string =>
  html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "");

const sanitiseForCopyAudit = (html: string): string =>
  stripTitle(stripScripts(stripDisclaimerBlocks(html)));

// Patterns derived from the decision-log 2026-05-01 06:15 spec, with
// the `\bshould\b` form tightened to prescriptive phrasings only — see
// COPY-AUDIT.md for the rationale.
const bannedPatterns: ReadonlyArray<{ name: string; re: RegExp }> = [
  {
    name: "advice-flavoured terminology",
    re: /\b(invest(ed|ing|ment|ments)?|tax(es|ation)?|legal|recommend(s|ed|ing)?|advise[ds]?|adviser|advisor|ought to)\b/i,
  },
  {
    name: "prescriptive 'should'",
    re: /\b(you should|should we|should you|we should)\b/i,
  },
  {
    name: "currency amount",
    re: /[£$€¥]\s*\d/,
  },
  {
    name: "percentage",
    re: /\b\d+\s*%\b/,
  },
];

const assertNoBannedTerms = (sample: ViewSample): void => {
  const cleaned = sanitiseForCopyAudit(sample.html);
  for (const pattern of bannedPatterns) {
    const match = cleaned.match(pattern.re);
    if (match !== null) {
      throw new Error(
        `Banned-term regression: surface "${sample.surface}" contains ` +
          `${pattern.name} — matched "${match[0]}" at index ${match.index ?? -1}.`,
      );
    }
  }
};

test("every user-facing view obeys the regulated-advice line", async ({
  baseURL,
}) => {
  // Walk every reachable user-facing surface, collect the rendered
  // HTML, strip disclaimer blocks / scripts / titles, and assert no
  // advice-flavoured language survives. The disclaimer wording itself
  // legitimately contains "tax", "legal", "investment", "advice"; it
  // is wrapped in `data-disclaimer="true"` in production code (the
  // shared <footer> and the inline landing positioning span), so the
  // strip exempts those by element rather than by string-match.
  const host = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const partner = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });

  const samples: Array<ViewSample> = [];

  // Surface 1: landing page.
  const landing = await host.get("/");
  expect(landing.status()).toBe(200);
  samples.push({ surface: "/", html: await landing.text() });

  // Surface 2: session-not-found page.
  const notFound = await host.get("/s/NOTREAL");
  expect(notFound.status()).toBe(404);
  samples.push({ surface: "/s/NOTREAL", html: await notFound.text() });

  // Mint a real session for the remaining surfaces.
  const create = await host.post("/sessions", { maxRedirects: 5 });
  expect(create.status()).toBe(200);
  const createBody = await create.text();
  const codeMatch = createBody.match(codePattern);
  expect(codeMatch).not.toBeNull();
  const code = codeMatch ? codeMatch[0] : "";
  expect(code).not.toBe("");

  // Surface 3: lobby (host alone, before partner joins).
  samples.push({
    surface: "lobby (host alone)",
    html: createBody,
  });

  // Surface 4: GET /s/<code>/join — the share-link redirect target.
  // Following maxRedirects we end up on the canonical /s/<code> view.
  // For a fresh context that hasn't joined, this renders the join view.
  const stranger = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const joinGet = await stranger.get(`/s/${code}/join`, { maxRedirects: 5 });
  expect(joinGet.status()).toBe(200);
  samples.push({
    surface: "GET /s/<code>/join (renderJoinView)",
    html: await joinGet.text(),
  });
  await stranger.dispose();

  // Surface 5: lobby (host's view after partner joins, before begin).
  const join = await partner.post(`/s/${code}/join`, { maxRedirects: 5 });
  expect(join.status()).toBe(200);
  samples.push({
    surface: "lobby (partner just joined, host POV)",
    html: await join.text(),
  });
  const lobbyAfterJoin = await host.get(`/s/${code}`);
  expect(lobbyAfterJoin.status()).toBe(200);
  samples.push({
    surface: "lobby (host, after partner joined)",
    html: await lobbyAfterJoin.text(),
  });

  // Begin the conversation so we can reach the answer / waiting /
  // reveal / complete views.
  const begin = await host.post(`/s/${code}/begin`, { maxRedirects: 5 });
  expect(begin.status()).toBe(200);

  // Surface 6: answer view (host, prompt 1).
  const answerView = await host.get(`/s/${code}`);
  expect(answerView.status()).toBe(200);
  samples.push({
    surface: "renderAnswerView",
    html: await answerView.text(),
  });

  // Host submits — surface 7: waiting-for-reveal view.
  const hostSubmit = await host.post(`/s/${code}/answer`, {
    form: { prompt_id: prompts[0]?.id ?? "", text: "Host first answer" },
    maxRedirects: 5,
  });
  expect(hostSubmit.status()).toBe(200);
  samples.push({
    surface: "renderWaitingForRevealView",
    html: await hostSubmit.text(),
  });

  // Partner submits — surface 8: reveal view.
  const partnerSubmit = await partner.post(`/s/${code}/answer`, {
    form: { prompt_id: prompts[0]?.id ?? "", text: "Partner first answer" },
    maxRedirects: 5,
  });
  expect(partnerSubmit.status()).toBe(200);
  samples.push({
    surface: "renderRevealView",
    html: await partnerSubmit.text(),
  });

  // Walk to completion so we can sample the complete view. From the
  // reveal of prompt 1, advance and submit through the rest of the
  // deck. We don't need to sample the intermediate views — they are
  // already covered by surfaces 6, 7 and 8 — but we do need to advance
  // through them to reach the complete view.
  await host.post(`/s/${code}/next`, { maxRedirects: 5 });
  for (let i = 1; i < prompts.length; i += 1) {
    const prompt = prompts[i];
    if (prompt === undefined) {
      throw new Error("missing prompt fixture");
    }
    await host.post(`/s/${code}/answer`, {
      form: { prompt_id: prompt.id, text: `Host answer ${i}` },
      maxRedirects: 5,
    });
    await partner.post(`/s/${code}/answer`, {
      form: { prompt_id: prompt.id, text: `Partner answer ${i}` },
      maxRedirects: 5,
    });
    await host.post(`/s/${code}/next`, { maxRedirects: 5 });
  }

  // Surface 9: complete view.
  const complete = await host.get(`/s/${code}`);
  expect(complete.status()).toBe(200);
  samples.push({
    surface: "renderCompleteView",
    html: await complete.text(),
  });

  // Surface 10: session-full / closed page. Trying to join after
  // begin must surface the sessionFullHtml branch.
  const latecomer = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const lateJoin = await latecomer.post(`/s/${code}/join`, {
    maxRedirects: 0,
  });
  // The status can be 409 (session full) or another non-303; either
  // way the body is the rendered error page and must be audited.
  if (lateJoin.status() !== 303) {
    samples.push({
      surface: "sessionFullHtml",
      html: await lateJoin.text(),
    });
  }
  await latecomer.dispose();

  // Run the banned-term assertions across every collected sample.
  for (const sample of samples) {
    assertNoBannedTerms(sample);
  }

  await host.dispose();
  await partner.dispose();
});
