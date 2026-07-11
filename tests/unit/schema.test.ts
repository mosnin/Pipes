import { describe, expect, it } from "vitest";
import { LooperSchemaV1 } from "@/domain/looper_schema_v1/schema";
import { sampleData } from "@/lib/convex/mockData";

describe("pipes schema", () => {
  it("parses sample document", () => {
    expect(() => LooperSchemaV1.parse(sampleData)).not.toThrow();
  });
});
