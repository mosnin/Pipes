import { describe, expect, it } from "vitest";
import { safeReturnTo } from "@/lib/auth/session";

describe("safeReturnTo", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeReturnTo("/systems/sys_1")).toBe("/systems/sys_1");
  });

  it("blocks open redirects", () => {
    expect(safeReturnTo("https://evil.example")).toBe("/dashboard");
    expect(safeReturnTo("//evil.example")).toBe("/dashboard");
    expect(safeReturnTo("/\\evil.example")).toBe("/dashboard");
    expect(safeReturnTo(null)).toBe("/dashboard");
  });
});
