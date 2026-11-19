import { test, expect } from "@playwright/test";

test("two sessions observe shared state", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await pageA.goto("/api/auth/login?returnTo=/dashboard");
  await pageB.goto("/api/auth/login?returnTo=/dashboard");

  await pageA.getByRole("button", { name: "New workflow" }).first().click();
  await pageA.getByLabel("Name").fill("Realtime System");
  await pageA.getByRole("button", { name: "Create workflow" }).click();
  // A cold dev server compiles the editor on first visit.
  await expect(pageA).toHaveURL(/\/systems\//, { timeout: 30000 });

  const url = pageA.url();
  await pageB.goto(url);
  await pageA.getByRole("button", { name: "Add Agent" }).first().click();

  await expect(pageB.getByText(/^1 nodes/)).toBeVisible({ timeout: 30000 });
  await pageB.getByRole("tab", { name: /Validation/ }).click();
  await expect(pageB.getByText(/is not connected\./).first()).toBeVisible({ timeout: 30000 });

  await contextA.close();
  await contextB.close();
});
