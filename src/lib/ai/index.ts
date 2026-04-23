import { z } from "zod";
import { env, runtimeFlags } from "@/lib/env";

export const AiDraftNodeSchema = z.object({ id: z.string(), type: z.string(), title: z.string(), description: z.string().optional(), x: z.number(), y: z.number() });
export const AiDraftPipeSchema = z.object({ fromNodeId: z.string(), toNodeId: z.string() });

export const AiSystemDraftSchema = z.object({
  systemName: z.string(),
  description: z.string().default(""),
  nodes: z.array(AiDraftNodeSchema).min(2),
  pipes: z.array(AiDraftPipeSchema),
  assumptions: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([])
});

export const AiEditSuggestionSchema = z.object({
  summary: z.string(),
  changes: z.array(z.object({ action: z.enum(["addNode", "updateNode", "deleteNode", "addPipe", "deletePipe"]), nodeId: z.string().optional(), pipeId: z.string().optional(), payload: z.record(z.string(), z.any()).optional() })),
  assumptions: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([])
});

export type GenerateSystemRequest = {
  prompt: string;
  systemName?: string;
  domain?: string;
  complexity?: "simple" | "standard" | "advanced";
  stackPreferences?: string[];
  targetOutcome?: string;
};

export interface AiService {
  generateSystemFromPrompt(input: GenerateSystemRequest): Promise<z.infer<typeof AiSystemDraftSchema>>;
  suggestSystemEdits(input: { prompt: string; systemSummary: string; nodes: Array<{ id: string; title: string; type: string }> }): Promise<z.infer<typeof AiEditSuggestionSchema>>;
}

const deterministicDraft: z.infer<typeof AiSystemDraftSchema> = {
  systemName: "AI Generated Support Router",
  description: "Routes support requests with guardrails and approval.",
  nodes: [
    { id: "n_input", type: "Input", title: "Inbound Request", x: 120, y: 160 },
    { id: "n_classifier", type: "Agent", title: "Intent Classifier", x: 360, y: 160 },
    { id: "n_guard", type: "Guardrail", title: "Policy Guard", x: 620, y: 160 },
    { id: "n_output", type: "Output", title: "Final Response", x: 860, y: 160 }
  ],
  pipes: [{ fromNodeId: "n_input", toNodeId: "n_classifier" }, { fromNodeId: "n_classifier", toNodeId: "n_guard" }, { fromNodeId: "n_guard", toNodeId: "n_output" }],
  assumptions: ["Assumes customer support intake workflow."],
  warnings: ["Human approval may be required for high-risk intents."]
};

class MockAiService implements AiService {
  async generateSystemFromPrompt(input: GenerateSystemRequest) {
    return { ...deterministicDraft, systemName: input.systemName ?? deterministicDraft.systemName, assumptions: [`Generated from prompt: ${input.prompt}`] };
  }
  async suggestSystemEdits() {
    return AiEditSuggestionSchema.parse({
      summary: "Add a monitor node and improve naming.",
      changes: [{ action: "addNode", payload: { type: "Monitor", title: "Latency Monitor", x: 500, y: 320 } }],
      assumptions: ["Assumes latency is critical."],
      warnings: []
    });
  }
}

class OpenAiService implements AiService {
  private model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  async generateSystemFromPrompt(input: GenerateSystemRequest) {
    const prompt = `Return JSON only. Build a structured agentic system draft. Prompt: ${input.prompt}`;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "authorization": `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: this.model, temperature: 0.2, messages: [{ role: "system", content: "You output strict JSON matching the schema." }, { role: "user", content: prompt }] })
    });
    const body = await res.json();
    const text = body?.choices?.[0]?.message?.content ?? "{}";
    return AiSystemDraftSchema.parse(JSON.parse(text));
  }

  async suggestSystemEdits(input: { prompt: string; systemSummary: string; nodes: Array<{ id: string; title: string; type: string }> }) {
    const prompt = `Return JSON only. Suggest structured changes. Prompt: ${input.prompt}. System: ${input.systemSummary}. Nodes: ${JSON.stringify(input.nodes)}`;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "authorization": `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ model: this.model, temperature: 0.2, messages: [{ role: "system", content: "You output strict JSON matching the schema." }, { role: "user", content: prompt }] })
    });
    const body = await res.json();
    const text = body?.choices?.[0]?.message?.content ?? "{}";
    return AiEditSuggestionSchema.parse(JSON.parse(text));
  }
}

export function getAiService(): AiService {
  if (runtimeFlags.useMocks || !runtimeFlags.hasOpenAI) return new MockAiService();
  return new OpenAiService();
}
