import { z } from "zod";
import { env, runtimeFlags } from "@/lib/env";
import type { SubAgentContextPack, SubAgentTask } from "@/domain/agent_builder/sub_agents";
import { getSkillDefinition } from "@/domain/services/agent_skills";

export const SubAgentProviderOutputSchema = z.object({
  planRefinement: z.string().optional(),
  critique: z.string().optional(),
  openQuestions: z.array(z.string()).default([]),
  proposalInputs: z.array(z.object({ actionType: z.enum(["add_annotation", "delete_node"]), rationale: z.string() })).default([]),
  conflictSignals: z.array(z.string()).default([])
});
export type SubAgentProviderOutput = z.infer<typeof SubAgentProviderOutputSchema>;

export type SubAgentExecutionRequest = {
  role: SubAgentTask["role"];
  skillId: string;
  contextPack: SubAgentContextPack;
  userMessage: string;
};

export interface SubAgentProvider {
  execute(input: SubAgentExecutionRequest): Promise<SubAgentProviderOutput>;
}

class MockSubAgentProvider implements SubAgentProvider {
  async execute(input: SubAgentExecutionRequest): Promise<SubAgentProviderOutput> {
    const risky = input.userMessage.toLowerCase().includes("delet") && input.role !== "architect_sub_agent";
    return {
      planRefinement: `Scoped plan for ${input.contextPack.subsystemId} using ${input.skillId}.`,
      critique: input.contextPack.relevantValidationIssues[0] ?? "No critical validation blockers in local scope.",
      openQuestions: risky ? [`Should ${input.contextPack.subsystemId} destructive edits be held for approval?`] : [],
      proposalInputs: [{ actionType: "add_annotation", rationale: `${input.contextPack.subsystemId}: add guardrail annotation` }, ...(risky ? [{ actionType: "delete_node" as const, rationale: `${input.contextPack.subsystemId}: risky cleanup candidate` }] : [])],
      conflictSignals: risky ? ["potential_destructive_change"] : []
    };
  }
}

class OpenAiSubAgentProvider implements SubAgentProvider {
  async execute(input: SubAgentExecutionRequest): Promise<SubAgentProviderOutput> {
    const skill = getSkillDefinition(input.skillId);
    const prompt = {
      role: input.role,
      skill: skill?.name ?? input.skillId,
      purpose: skill?.purpose ?? "",
      constraints: ["Use only bounded context.", "Never claim graph mutation executed.", "Return strict JSON."],
      context: input.contextPack,
      request: input.userMessage
    };
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a bounded subsystem specialist. Output JSON with keys: planRefinement, critique, openQuestions, proposalInputs(actionType add_annotation|delete_node + rationale), conflictSignals." },
          { role: "user", content: JSON.stringify(prompt) }
        ]
      })
    });
    if (!res.ok) throw new Error("sub_agent_provider_failed");
    const body = await res.json();
    const content = body?.choices?.[0]?.message?.content;
    if (!content) throw new Error("sub_agent_empty_output");
    return SubAgentProviderOutputSchema.parse(JSON.parse(content));
  }
}

export function getSubAgentProvider(): SubAgentProvider {
  if (runtimeFlags.useMocks || !runtimeFlags.hasOpenAI) return new MockSubAgentProvider();
  return new OpenAiSubAgentProvider();
}
