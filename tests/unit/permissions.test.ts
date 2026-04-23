import { describe, expect, it } from "vitest";
import { canComment, canEditSystem, canManageMembers, canUseAiFeatures, canViewSystem } from "@/domain/permissions";

describe("permissions", () => {
  it("applies role hierarchy", () => {
    expect(canViewSystem("Viewer")).toBe(true);
    expect(canComment("Viewer")).toBe(false);
    expect(canEditSystem("Editor")).toBe(true);
    expect(canManageMembers("Editor")).toBe(false);
    expect(canUseAiFeatures("Admin")).toBe(true);
  });
});
