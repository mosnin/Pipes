import { describe, expect, it, vi } from "vitest";

// Input validation lives in the route (CompileRequestSchema/DagPlanRequestSchema.parse).
// These tests cover the function-level contracts: mock shape correctness, structural
// invariants (all pipe refs resolve, levels cover real node ids, etc.).

vi.mock("@/lib/env", () => ({
  env: {},
  runtimeFlags: { useMocks: true, hasOpenAI: false, hasOpenRouter: false },
  DEFAULT_OPENROUTER_MODEL: "test-model",
}));

vi.mock("@/lib/composition/server", () => ({ getServerApp: vi.fn() }));

import { compileDocument, DOC_TYPES } from "@/lib/ai/compiler";
import { planDag } from "@/lib/ai/dag_planner";
import { AiSystemDraftSchema } from "@/lib/ai";
import { AgentDagSchema } from "@/lib/ai/dag_planner";

describe("compileDocument (mock mode)", () => {
  it("returns a valid AiSystemDraft for every doc type", async () => {
    for (const docType of DOC_TYPES) {
      const result = await compileDocument({ content: "x".repeat(20), docType });
      expect(() => AiSystemDraftSchema.parse(result)).not.toThrow();
      expect(result.nodes.length).toBeGreaterThanOrEqual(2);
      expect(result.systemName).toBeTruthy();
    }
  });

  it("sop mock has an Input and an Output node", async () => {
    const result = await compileDocument({ content: "x".repeat(20), docType: "sop" });
    expect(result.nodes.some((n) => n.type === "Input")).toBe(true);
    expect(result.nodes.some((n) => n.type === "Output")).toBe(true);
  });

  it("api_spec mock has Tool or ExternalApi nodes", async () => {
    const result = await compileDocument({ content: "x".repeat(20), docType: "api_spec" });
    const types = result.nodes.map((n) => n.type.toLowerCase());
    expect(types.some((t) => t === "tool" || t === "externalapi")).toBe(true);
  });

  it("every pipe references nodes that exist in the same graph", async () => {
    for (const docType of DOC_TYPES) {
      const result = await compileDocument({ content: "x".repeat(20), docType });
      const nodeIds = new Set(result.nodes.map((n) => n.id));
      for (const pipe of result.pipes) {
        expect(nodeIds.has(pipe.fromNodeId), `fromNodeId ${pipe.fromNodeId} missing in ${docType}`).toBe(true);
        expect(nodeIds.has(pipe.toNodeId), `toNodeId ${pipe.toNodeId} missing in ${docType}`).toBe(true);
      }
    }
  });

  it("all mock graphs have unique node ids", async () => {
    for (const docType of DOC_TYPES) {
      const result = await compileDocument({ content: "x".repeat(20), docType });
      const ids = result.nodes.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("planDag (mock mode)", () => {
  it("returns a valid AgentDag", async () => {
    const result = await planDag({ goal: "Process customer emails", parallelism: "auto" });
    expect(() => AgentDagSchema.parse(result)).not.toThrow();
  });

  it("executionPlan level nodeIds all reference real nodes", async () => {
    const result = await planDag({ goal: "test goal", parallelism: "auto" });
    const nodeIds = new Set(result.nodes.map((n) => n.id));
    for (const level of result.executionPlan.levels) {
      for (const nid of level.nodeIds) {
        expect(nodeIds.has(nid), `execution plan references unknown node ${nid}`).toBe(true);
      }
    }
  });

  it("every level has at least one node", async () => {
    const result = await planDag({ goal: "test goal", parallelism: "parallel" });
    for (const level of result.executionPlan.levels) {
      expect(level.nodeIds.length).toBeGreaterThan(0);
    }
  });

  it("all pipes reference existing nodes", async () => {
    const result = await planDag({ goal: "test goal", parallelism: "sequential" });
    const nodeIds = new Set(result.nodes.map((n) => n.id));
    for (const pipe of result.pipes) {
      expect(nodeIds.has(pipe.fromNodeId), `fromNodeId ${pipe.fromNodeId} missing`).toBe(true);
      expect(nodeIds.has(pipe.toNodeId), `toNodeId ${pipe.toNodeId} missing`).toBe(true);
    }
  });

  it("mock dag has parallelizable=true and multiple levels", async () => {
    const result = await planDag({ goal: "any goal", parallelism: "auto" });
    expect(result.parallelizable).toBe(true);
    expect(result.executionPlan.levels.length).toBeGreaterThan(1);
  });
});
