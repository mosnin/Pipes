import { createHash } from "node:crypto";
import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import type { HandoffExportRecord } from "@/domain/handoff/model";
import { HandoffGenerationService } from "@/domain/services/handoff_generation";

const now = () => new Date().toISOString();
const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

export class HandoffExportService {
  private readonly generation: HandoffGenerationService;
  constructor(private readonly repos: RepositorySet) {
    this.generation = new HandoffGenerationService(repos);
  }

  async export(ctx: AppContext, input: { packageId: string; format: "markdown_bundle" | "json_manifest" | "prompt_pack_text" }) {
    const bundle = await this.generation.getPackage(ctx, input.packageId);
    if (bundle.package.status !== "approved") throw new Error("handoff_package_not_approved");
    const content = this.buildContent(bundle.package, bundle.artifacts, input.format);
    const digest = createHash("sha256").update(content).digest("hex");
    const record: HandoffExportRecord = { id: id("hexp"), packageId: input.packageId, target: bundle.package.target, format: input.format, exportedAt: now(), exportedBy: ctx.userId, digest };
    await this.repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, systemId: bundle.package.systemId, scope: "system", type: "plan_memory", source: "run_artifact", confidence: "high", status: "active", title: `export:${bundle.package.id}`, summary: input.format, detail: JSON.stringify(record), tags: ["handoff_export", `package:${bundle.package.id}`], provenance: { createdBy: ctx.userId }, createdAt: now(), updatedAt: now() });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: bundle.package.systemId as never, action: "handoff_exported", targetType: "handoff_package", targetId: bundle.package.id, outcome: "success", metadata: JSON.stringify({ format: input.format, digest }) });
    return { record, content };
  }

  async getPromptPack(ctx: AppContext, input: { packageId: string; target?: "human_engineer" | "codex" | "claude_code" | "general_llm_builder" }) {
    const bundle = await this.generation.getPackage(ctx, input.packageId);
    const prompt = bundle.artifacts.find((a) => a.type === "coding_agent_prompt" && (!input.target || a.target === input.target)) ?? bundle.artifacts.find((a) => a.type === "coding_agent_prompt");
    if (!prompt) throw new Error("prompt_pack_not_found");
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: bundle.package.systemId as never, action: "coding_agent_prompt_pack_opened", targetType: "handoff_package", targetId: bundle.package.id, outcome: "success" });
    return { packageId: bundle.package.id, target: prompt.target, prompt: prompt.content };
  }

  private buildContent(pkg: any, artifacts: any[], format: "markdown_bundle" | "json_manifest" | "prompt_pack_text") {
    if (format === "json_manifest") return JSON.stringify({ package: pkg, artifacts }, null, 2);
    if (format === "prompt_pack_text") return artifacts.filter((a) => a.type === "coding_agent_prompt").map((a) => `# ${a.title}\n${a.content}`).join("\n\n");
    return [`# ${pkg.title}`, `- Package: ${pkg.id}`, `- Target: ${pkg.target}`, `- Version: ${pkg.version}`, ...artifacts.map((a) => `\n## ${a.title}\n${a.content}`)].join("\n");
  }
}
