import { describe, expect, it } from "vitest";
import { getConfigSchema } from "@/domain/node_config/schema";

describe("node config schemas", () => {
  it("gives every functional node type real typed config fields", () => {
    // The entry/exit and control types a user reaches for first must not be
    // hollow. Each should expose at least one typed field.
    const functional = [
      "Input",
      "Output",
      "Trigger",
      "Agent",
      "Tool",
      "Action",
      "Condition",
      "Decision",
      "Router",
      "Queue",
      "Loop",
      "LoopControl",
      "Evaluator",
      "HumanReview",
      "Environment",
    ] as const;
    for (const type of functional) {
      const fields = getConfigSchema(type);
      expect(fields.length, `${type} should have config fields`).toBeGreaterThan(0);
      for (const f of fields) {
        expect(f.key).toBeTruthy();
        expect(f.label).toBeTruthy();
      }
    }
  });
});
