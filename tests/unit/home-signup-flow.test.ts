import { describe, expect, it } from "vitest";
import { homeSections } from "@/lib/public/content";

describe("homepage to signup flow", () => {
  it("uses tracked signup entry sources in CTA hrefs", () => {
    expect(homeSections.hero.primaryCta.href).toContain("source=");
    expect(homeSections.finalCta.href).toContain("source=");
  });
});
