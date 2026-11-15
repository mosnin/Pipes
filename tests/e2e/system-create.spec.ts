import { test, expect } from "@playwright/test";

test("mock auth onboarding create flow", async ({ page }) => {
  await page.goto("/api/auth/login?returnTo=/dashboard");
  await expect(page.getByRole("heading", { name: "Systems", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "New system" }).first().click();
  await page.getByLabel("Name").fill("E2E System");
  await page.getByRole("button", { name: "Create system" }).click();
  await expect(page).toHaveURL(/\/systems\//);
});
