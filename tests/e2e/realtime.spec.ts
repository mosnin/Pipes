import { test, expect } from "@playwright/test";

test("two sessions observe shared state", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await pageA.goto("/api/auth/login?returnTo=/dashboard");
  await pageB.goto("/api/auth/login?returnTo=/dashboard");

  await pageA.getByPlaceholder("System name").fill("Realtime System");
  await pageA.getByRole("button", { name: "Create system" }).click();
  await expect(pageA).toHaveURL(/\/systems\//);

  const url = pageA.url();
  await pageB.goto(url);
  await pageA.getByRole("button", { name: "Agent" }).first().click();

  await expect(pageB.getByText("Agent Node is not connected.")).toBeVisible({ timeout: 10000 });

  await contextA.close();
  await contextB.close();
});
