import { describe, expect, it } from "vitest";
import { simulateSystem } from "@/domain/simulation";
import { sampleData, sampleSystem } from "@/lib/convex/mockData";

describe("simulation", () => {
  it("walks a path", () => {
    const run = simulateSystem(sampleSystem, sampleData.nodes, sampleData.ports, sampleData.pipes, { decision: "primary" });
    expect(run.steps.length).toBeGreaterThan(0);
    expect(["success", "halted"]).toContain(run.status);
  });
});
