import { describe, expect, it } from "vitest";
import { comparisons, homeSections, templateMarketing, useCases } from "@/lib/public/content";

describe("public content model integrity", () => {
  it("has coherent homepage and non-empty discovery models", () => {
    expect(homeSections.hero.title.length).toBeGreaterThan(10);
    expect(useCases.length).toBeGreaterThanOrEqual(5);
    expect(comparisons.length).toBeGreaterThanOrEqual(4);
    expect(templateMarketing.length).toBeGreaterThan(0);
  });

  it("ensures unique slugs across use cases and comparisons", () => {
    expect(new Set(useCases.map((u) => u.slug)).size).toBe(useCases.length);
    expect(new Set(comparisons.map((c) => c.slug)).size).toBe(comparisons.length);
  });
});
