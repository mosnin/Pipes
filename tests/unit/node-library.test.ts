import { describe, expect, it } from "vitest";
import { nodeTypeValues } from "@/domain/pipes_schema_v1/schema";
import { nodeLibraryCatalog } from "@/domain/templates/node_library";

describe("node library", () => {
  it("offers every step type a user can add (Subsystem comes from grouping)", () => {
    const offered = new Set(nodeLibraryCatalog.map((entry) => entry.nodeType));
    const missing = nodeTypeValues.filter((type) => type !== "Subsystem" && !offered.has(type));
    expect(missing).toEqual([]);
  });

  it("includes human approval, which runs and the approvals inbox depend on", () => {
    expect(nodeLibraryCatalog.some((entry) => entry.nodeType === "HumanApproval")).toBe(true);
  });
});
