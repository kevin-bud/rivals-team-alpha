import { test, expect, request as playwrightRequest } from "@playwright/test";

const codePattern = /\b[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}\b/;

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
  expect(partnerBody).toContain("2 of 2 here");
  expect(partnerBody).toContain(code);

  // Host refreshes — should also now see 2 of 2.
  const hostRefresh = await host.get(`/s/${code}`);
  expect(hostRefresh.status()).toBe(200);
  expect(await hostRefresh.text()).toContain("2 of 2 here");

  await host.dispose();
  await partner.dispose();
});
