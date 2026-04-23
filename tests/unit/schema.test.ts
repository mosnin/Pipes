import { describe, expect, it } from "vitest";
import { PipesSchemaV1 } from "@/domain/pipes_schema_v1/schema";
import { sampleData } from "@/lib/convex/mockData";

describe("pipes schema", () => {
  it("parses sample document", () => {
    expect(() => PipesSchemaV1.parse(sampleData)).not.toThrow();
  });
});
