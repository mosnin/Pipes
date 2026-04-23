import { test, expect } from "@playwright/test";

test("editor shell renders", async ({ page }) => {
  await page.goto("/api/auth/login?returnTo=/dashboard");
  const openButtons = page.getByRole("button", { name: /Open / });
  if (await openButtons.count()) {
    await openButtons.first().click();
  } else {
    await page.getByPlaceholder("System name").fill("Editor Smoke");
    await page.getByRole("button", { name: "Create system" }).click();
  }
  await expect(page.getByText("Inspector")).toBeVisible({ timeout: 10000 });
});
