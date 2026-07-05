import { env, runtimeFlags } from "@/lib/env";
import type { SubAgentExecutionRequest, SubAgentProviderOutput } from "@/lib/ai/sub_agents";
import { SubAgentProviderOutputSchema } from "@/lib/ai/sub_agents";

export type HarnessExecution = { output: SubAgentProviderOutput; metadata: { harness: "agents_sdk" | "chat_completions" | "mock"; model?: string } };

export class OpenAIAgentHarnessService {
  async execute(input: SubAgentExecutionRequest): Promise<HarnessExecution> {
    if (!runtimeFlags.hasOpenAI) {
      return { output: SubAgentProviderOutputSchema.parse({ planRefinement: `Mock harness plan for ${input.contextPack.subsystemId}`, critique: "Mock harness mode", openQuestions: [], proposalInputs: [{ actionType: "add_annotation", rationale: "mock_harness_annotation" }], conflictSignals: [] }), metadata: { harness: "mock" } };
    }

    // Optional best-effort use of OpenAI Agents SDK when installed.
    try {
      const sdk = await (new Function("return import(\"@openai/agents\")")() as Promise<any>);
      const runResult = await (sdk as any).run({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        instructions: "Return strict JSON keys: planRefinement, critique, openQuestions, proposalInputs, conflictSignals",
        input: JSON.stringify(input)
      });
      const text = typeof runResult?.output_text === "string" ? runResult.output_text : runResult?.output?.[0]?.content?.[0]?.text;
      if (!text) throw new Error("agents_sdk_empty_output");
      return { output: SubAgentProviderOutputSchema.parse(JSON.parse(text)), metadata: { harness: "agents_sdk", model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini" } };
    } catch {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "You are Pipes runtime harness. Return strict JSON keys: planRefinement, critique, openQuestions, proposalInputs(actionType add_annotation|delete_node + rationale), conflictSignals." },
            { role: "user", content: JSON.stringify(input) }
          ]
        })
      });
      if (!res.ok) throw new Error("openai_harness_failed");
      const body = await res.json();
      const content = body?.choices?.[0]?.message?.content;
      if (!content) throw new Error("openai_harness_empty_output");
      return { output: SubAgentProviderOutputSchema.parse(JSON.parse(content)), metadata: { harness: "chat_completions", model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini" } };
    }
  }
}
