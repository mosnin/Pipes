import { describe, expect, it } from "vitest";
import { nodeTypeValues } from "@/domain/pipes_schema_v1/schema";
import { compatibilityScore, groupByCategory, nodeLibraryCatalog, rankLibraryEntries } from "@/domain/templates/node_library";

describe("node library model", () => {
  it("searches and ranks promoted matches", () => {
    const ranked = rankLibraryEntries({ query: "reasoning", favorites: [], recents: [] });
    expect(ranked[0]?.nodeType).toBeTruthy();
    expect(ranked.some((entry) => entry.nodeType === "Agent")).toBe(true);
  });

  it("boosts compatibility for selected node context", () => {
    const agent = nodeLibraryCatalog.find((entry) => entry.nodeType === "Agent");
    const tool = nodeLibraryCatalog.find((entry) => entry.nodeType === "Tool");
    expect(agent && tool).toBeTruthy();
    if (!agent || !tool) return;
    expect(compatibilityScore(tool, { mode: "selectedNode", sourceNodeType: "Agent" })).toBeGreaterThan(compatibilityScore(agent, { mode: "selectedNode", sourceNodeType: "Agent" }));
  });

  it("surfaces favorites and recents above alphabetical fallback", () => {
    const ranked = rankLibraryEntries({ query: "", favorites: ["Router"], recents: ["Memory"], context: { mode: "canvas" } });
    const routerIndex = ranked.findIndex((entry) => entry.nodeType === "Router");
    const datatoreIndex = ranked.findIndex((entry) => entry.nodeType === "Datastore");
    expect(routerIndex).toBeGreaterThanOrEqual(0);
    expect(datatoreIndex).toBeGreaterThanOrEqual(0);
    expect(routerIndex).toBeLessThan(datatoreIndex);
  });

  it("groups catalog entries by category", () => {
    const grouped = groupByCategory(rankLibraryEntries({ query: "", favorites: [], recents: [] }));
    expect(grouped.length).toBeGreaterThan(1);
    expect(grouped[0].entries.length).toBeGreaterThan(0);
  });
});

describe("node library coverage", () => {
  it("offers every step type a user can add (Subsystem comes from grouping)", () => {
    const offered = new Set(nodeLibraryCatalog.map((entry) => entry.nodeType));
    const missing = nodeTypeValues.filter((type) => type !== "Subsystem" && !offered.has(type));
    expect(missing).toEqual([]);
  });

  it("includes human approval, which runs and the approvals inbox depend on", () => {
    expect(nodeLibraryCatalog.some((entry) => entry.nodeType === "HumanApproval")).toBe(true);
  });
});
