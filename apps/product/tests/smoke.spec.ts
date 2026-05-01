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
