import { describe, expect, it } from "vitest";
import { getEntitlements } from "@/domain/templates/plans";

describe("entitlements", () => {
  it("returns plan limits", () => {
    expect(getEntitlements("Free").maxSystems).toBe(3);
    expect(getEntitlements("Pro").apiMcpAccess).toBe(true);
  });
});
