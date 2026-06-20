import { describe, expect, it } from "vitest";
import { simulateSystem } from "@/domain/simulation";
import { sampleData, sampleSystem } from "@/lib/convex/mockData";

describe("simulation", () => {
  it("walks a path", () => {
    const run = simulateSystem(sampleSystem, sampleData.nodes, sampleData.ports, sampleData.pipes, { decision: "primary" });
    expect(run.steps.length).toBeGreaterThan(0);
    expect(["success", "halted"]).toContain(run.status);
  });

  it("produces honest trace summaries (traced, not executed)", () => {
    const run = simulateSystem(sampleSystem, sampleData.nodes, sampleData.ports, sampleData.pipes, { decision: "primary" });
    const joined = run.steps.map((s) => s.summary).join(" ").toLowerCase();
    expect(joined).not.toContain("executed");
    expect(run.steps.some((s) => /traced|reached output|branched|loop/i.test(s.summary))).toBe(true);
  });

  it("halts when there is no entry node", () => {
    const nodesNoEntry = sampleData.nodes.map((n) =>
      n.type === "Input" || n.type === "Trigger" ? { ...n, type: "Agent" as const } : n,
    );
    const run = simulateSystem(sampleSystem, nodesNoEntry, sampleData.ports, sampleData.pipes, {});
    expect(run.status).toBe("halted");
    expect(run.steps).toHaveLength(0);
  });
});
