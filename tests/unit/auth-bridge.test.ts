import { describe, expect, it } from "vitest";
import { compatibleArgs, matches } from "@/lib/auth/convex-adapter";

describe("Better Auth to Convex bridge", () => {
  it("rewrites `_id ne X` to `_id not_in [X]`, which the component accepts and which selects the same rows", () => {
    const args = { input: { model: "verification", where: [{ field: "identifier", operator: "eq", value: "2fa-x" }, { field: "_id", operator: "ne", value: "id1" }] } };
    expect(compatibleArgs(args).input.where[1]).toEqual({ field: "_id", operator: "not_in", value: ["id1"] });
    expect(compatibleArgs(args).input.where[0]).toEqual(args.input.where[0]);
    expect(compatibleArgs({ model: "user", where: [{ field: "email", operator: "ne", value: "a" }] }).where[0].operator).toBe("ne");
  });

  it("applies the conditions the delete fallback filters itself, exactly", () => {
    const row = { _id: "a", identifier: "2fa-x", createdAt: 100 };
    expect(matches(row, { field: "identifier", value: "2fa-x" })).toBe(true);
    expect(matches(row, { field: "createdAt", operator: "lte", value: 100 })).toBe(true);
    expect(matches(row, { field: "createdAt", operator: "lt", value: 100 })).toBe(false);
    expect(matches(row, { field: "_id", operator: "not_in", value: ["a"] })).toBe(false);
    expect(matches(row, { field: "_id", operator: "not_in", value: ["b"] })).toBe(true);
    expect(matches(row, { field: "createdAt", operator: "contains" as never, value: 1 })).toBe(false);
  });
});
