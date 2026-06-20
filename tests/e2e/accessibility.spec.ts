import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Public route a11y gate.
 *
 * Runs axe-core (WCAG 2.1 A + AA tags) against every reachable
 * marketing/public route and fails on any serious or critical violation.
 *
 * Mock mode (LOOPER_USE_MOCKS=true) is required so that auth-gated routes are
 * not hit and all marketing routes render without real services.
 */

const ROUTES: ReadonlyArray<string> = [
  "/",
  "/pricing",
  "/docs",
  "/protocol",
  "/templates",
  "/use-cases",
  "/compare",
  "/login",
  "/signup",
];

for (const route of ROUTES) {
  test(`a11y: ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blockers = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(blockers, JSON.stringify(blockers, null, 2)).toEqual([]);
  });
}
