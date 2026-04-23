import { describe, expect, it } from "vitest";
import { validateSystem } from "@/domain/validation";
import { sampleData, sampleSystem } from "@/lib/convex/mockData";

describe("validation", () => {
  it("detects known issues in sample graph", () => {
    const report = validateSystem(sampleSystem, sampleData.nodes, sampleData.ports, sampleData.pipes);
    expect(report.issues.length).toBeGreaterThan(0);
    expect(report.issues.some((issue) => issue.code === "orphan_node")).toBe(true);
  });
});
