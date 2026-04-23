import { describe, expect, it } from "vitest";
import { computeCompatibilityHint, createDefaultNodeDefinition, summarizeContract, validateNodeDefinition } from "@/components/editor/node_definition";

describe("node definition model", () => {
  it("builds default definitions by node type", () => {
    const definition = createDefaultNodeDefinition({ nodeId: "n1", nodeType: "Tool", title: "Tool Node" });
    expect(definition.input.portType).toBe("json");
    expect(definition.output.portType).toBe("json");
  });

  it("summarizes contract shape", () => {
    const definition = createDefaultNodeDefinition({ nodeId: "n1", nodeType: "Agent", title: "Agent" });
    definition.input.fields = [
      { id: "f1", key: "ticketId", type: "string", required: true, description: "Support ticket id" },
      { id: "f2", key: "priority", type: "string", required: false }
    ];
    expect(summarizeContract(definition.input)).toContain("1 required");
  });

  it("computes compatibility hints", () => {
    const source = createDefaultNodeDefinition({ nodeId: "s", nodeType: "Model", title: "Model" });
    const target = createDefaultNodeDefinition({ nodeId: "t", nodeType: "Prompt", title: "Prompt" });
    const hint = computeCompatibilityHint(source, target);
    expect(hint.compatible).toBe(true);
  });

  it("validates definition quality issues", () => {
    const definition = createDefaultNodeDefinition({ nodeId: "n1", nodeType: "Agent", title: "Agent" });
    definition.overview.owner = "owner@pipes.local";
    definition.input.fields = [{ id: "a", key: "", type: "string", required: true }];
    const issues = validateNodeDefinition(definition);
    expect(issues.length).toBeGreaterThan(1);
  });
});
