import { describe, expect, it } from "vitest";
import { growthEvents, isGrowthEvent } from "@/lib/public/metrics";

describe("growth signal model", () => {
  it("contains required conversion events", () => {
    expect(growthEvents).toContain("homepage_cta_clicked");
    expect(growthEvents).toContain("template_detail_viewed");
    expect(growthEvents).toContain("comparison_page_viewed");
    expect(growthEvents).toContain("logged_out_signup_entry_source");
  });

  it("validates event names with bounded guard", () => {
    expect(isGrowthEvent("signup_started")).toBe(true);
    expect(isGrowthEvent("totally_unknown_event")).toBe(false);
  });
});
