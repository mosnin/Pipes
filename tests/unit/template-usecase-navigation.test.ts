import { describe, expect, it } from "vitest";
import { publicContentService } from "@/domain/services/public";

describe("template discovery and use case navigation", () => {
  it("links each use case to at least one existing template", () => {
    const templates = new Set(publicContentService.listTemplates().map((t) => t.id));
    for (const useCase of publicContentService.listUseCases()) {
      expect(useCase.templateIds.length).toBeGreaterThan(0);
      for (const id of useCase.templateIds) expect(templates.has(id)).toBe(true);
    }
  });
});
