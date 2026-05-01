import {
  test,
  expect,
  request as playwrightRequest,
  type APIRequestContext,
} from "@playwright/test";

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
  expect(body).toContain("1 of 2 here");

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
  // With the second participant present the deck is unlocked, so the
  // landed-on view is the answer view for prompt 1, not the waiting
  // view. The first-prompt fragment proves the join took.
  expect(partnerBody).toContain("Prompt 1 of 5");
  expect(partnerBody).toContain('prompt_id" value="values-enough"');

  // Host refreshes — should also now see the answer view.
  const hostRefresh = await host.get(`/s/${code}`);
  expect(hostRefresh.status()).toBe(200);
  expect(await hostRefresh.text()).toContain("Prompt 1 of 5");

  await host.dispose();
  await partner.dispose();
});

test("host alone still sees the waiting view (1 of 2 here)", async ({
  baseURL,
}) => {
  const host = await playwrightRequest.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const create = await host.post("/sessions", { maxRedirects: 5 });
  expect(create.status()).toBe(200);
  const body = await create.text();
  expect(body).toContain("1 of 2 here");
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

  // Host should now be on the inside view, with the share URL rendered
  // as a clickable anchor.
  await expect(hostPage.getByText("1 of 2 here")).toBeVisible();
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
  // Either "2 of 2 here" (waiting view briefly) or the prompt-1 answer
  // view — both are valid landed-on states once the partner has joined.
  // The decisive thing is that we are not on the join view nor the 404.
  expect(partnerBody).not.toContain("Session not found");
  const showsBoth = partnerBody.includes("2 of 2 here");
  const showsPrompt = partnerBody.includes("Prompt 1 of 5");
  expect(
    showsBoth || showsPrompt,
    'partner must see either "2 of 2 here" or the first prompt after joining',
  ).toBe(true);

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

  // Partner joins so the deck is unlocked.
  const join = await partner.post(`/s/${code}/join`, { maxRedirects: 5 });
  expect(join.status()).toBe(200);

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

  // Partner joins so the deck is unlocked and the host's GET /s/<code>
  // lands on the answer view rather than the waiting-for-joiner view.
  const join = await partner.post(`/s/${code}/join`, { maxRedirects: 5 });
  expect(join.status()).toBe(200);

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

  // Host is on the waiting-for-joiner view; pull the share URL.
  await expect(hostPage.getByText("1 of 2 here")).toBeVisible();
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

  // Host navigates to the inside view; with the partner present, this
  // is the answer view for prompt 1.
  await hostPage.goto(`/s/${code}`);
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
