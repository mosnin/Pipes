import { test, expect } from "@playwright/test";

test("editor shell renders", async ({ page }) => {
  await page.goto("/api/auth/login?returnTo=/dashboard");
  await page.getByRole("button", { name: "New workflow" }).first().click();
  await page.getByLabel("Name").fill("Editor Smoke");
  await page.getByRole("button", { name: "Create workflow" }).click();
  await expect(page.getByText("Inspector")).toBeVisible({ timeout: 30000 });
});
