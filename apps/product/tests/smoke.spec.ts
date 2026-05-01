import { test, expect } from "@playwright/test";

test("landing page returns 200 and shows the product name", async ({
  request,
  page,
}) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);

  await page.goto("/");
  await expect(page).toHaveTitle(/Roundtable/);
  await expect(page.getByRole("heading", { name: "Roundtable" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start a session" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("coming soon");
});

test("session stub responds at /s/new", async ({ request }) => {
  const response = await request.get("/s/new");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Session");
});
