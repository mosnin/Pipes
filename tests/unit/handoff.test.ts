import { describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { HandoffGenerationService } from "@/domain/services/handoff_generation";
import { HandoffReviewService } from "@/domain/services/handoff_review";
import { HandoffExportService } from "@/domain/services/handoff_export";

const ctx = { userId: "usr_1", workspaceId: "wks_1", role: "Owner", plan: "Pro", actorType: "user" as const, actorId: "usr_1" };

describe("handoff generation and delivery", () => {
  it("generates typed package with structured artifacts", async () => {
    const repos = createMockRepositories();
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("system missing");
    const service = new HandoffGenerationService(repos);
    const generated = await service.generate(ctx as never, { systemId, target: "human_engineer" });
    expect(generated.package.systemId).toBe(systemId);
    expect(generated.artifacts.some((a) => a.type === "implementation_plan")).toBe(true);
    expect(generated.acceptanceCriteria.length).toBeGreaterThan(0);
  });

  it("supports target-specific prompt pack variants", async () => {
    const repos = createMockRepositories();
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("system missing");
    const generation = new HandoffGenerationService(repos);
    const codex = await generation.generate(ctx as never, { systemId, target: "codex" });
    const claude = await generation.generate(ctx as never, { systemId, target: "claude_code" });
    const codexPrompt = codex.artifacts.find((a) => a.type === "coding_agent_prompt")?.content ?? "";
    const claudePrompt = claude.artifacts.find((a) => a.type === "coding_agent_prompt")?.content ?? "";
    expect(codexPrompt).toContain("patch-first");
    expect(claudePrompt.length).toBeGreaterThan(0);
  });

  it("runs generate -> review -> approve -> export deterministically", async () => {
    const repos = createMockRepositories();
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("system missing");
    const generation = new HandoffGenerationService(repos);
    const review = new HandoffReviewService(repos);
    const exporter = new HandoffExportService(repos);
    const generated = await generation.generate(ctx as never, { systemId, target: "codex" });
    await review.review(ctx as never, { packageId: generated.package.id, decision: "approved" });
    const first = await exporter.export(ctx as never, { packageId: generated.package.id, format: "json_manifest" });
    const second = await exporter.export(ctx as never, { packageId: generated.package.id, format: "json_manifest" });
    expect(first.record.digest).toBe(second.record.digest);
  });

  it("supports revision request history and prompt pack retrieval", async () => {
    const repos = createMockRepositories();
    const systemId = (await repos.systems.list(ctx.workspaceId))[0]?.id;
    if (!systemId) throw new Error("system missing");
    const generation = new HandoffGenerationService(repos);
    const review = new HandoffReviewService(repos);
    const exporter = new HandoffExportService(repos);
    const generated = await generation.generate(ctx as never, { systemId, target: "claude_code" });
    await review.review(ctx as never, { packageId: generated.package.id, decision: "revision_requested", note: "Need stronger acceptance criteria mapping" });
    await review.review(ctx as never, { packageId: generated.package.id, decision: "approved" });
    const prompt = await exporter.getPromptPack(ctx as never, { packageId: generated.package.id, target: "claude_code" });
    expect(prompt.target).toBe("claude_code");
    expect(prompt.prompt).toContain("Acceptance criteria");
  });
});
