import { describe, expect, it } from "vitest";
import { publicContentService } from "@/domain/services/public";

describe("template and comparison detail behavior", () => {
  it("resolves known slugs and rejects unknown", () => {
    expect(publicContentService.getTemplate("multi-agent-handoff")).not.toBeNull();
    expect(publicContentService.getTemplate("missing-template")).toBeNull();
    expect(publicContentService.getComparison("figma")).not.toBeNull();
    expect(publicContentService.getComparison("missing-compare")).toBeNull();
  });
});
