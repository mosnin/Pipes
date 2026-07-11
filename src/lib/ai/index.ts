import { z } from "zod";
import { generateStructured } from "@/lib/ai/structured";

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

const SYSTEM_DRAFT_PROMPT =
  "You output strict JSON matching this shape: { systemName: string, description: string, nodes: [{ id: string, type: string, title: string, description?: string, x: number, y: number }], pipes: [{ fromNodeId: string, toNodeId: string }], assumptions: string[], warnings: string[] }. Build a complete agent loop with at least 3 nodes, a clear entry and exit, laid out left to right.";

const EDIT_SUGGESTION_PROMPT =
  "You output strict JSON: { summary: string, changes: [{ action: 'addNode'|'updateNode'|'deleteNode'|'addPipe'|'deletePipe', nodeId?: string, pipeId?: string, payload?: object }], assumptions: string[], warnings: string[] }.";

// Both methods are the same structured-generation call with different prompts,
// schemas, and mock fallbacks — provider selection lives in generateStructured.
export function getAiService(): AiService {
  return {
    generateSystemFromPrompt(input: GenerateSystemRequest) {
      return generateStructured({
        system: SYSTEM_DRAFT_PROMPT,
        user: `Build an agent loop for: ${input.prompt}`,
        schema: AiSystemDraftSchema,
        mock: () => ({
          ...deterministicDraft,
          systemName: input.systemName ?? deterministicDraft.systemName,
          assumptions: [`Generated from prompt: ${input.prompt}`],
        }),
      });
    },
    suggestSystemEdits(input) {
      return generateStructured({
        system: EDIT_SUGGESTION_PROMPT,
        user: `Request: ${input.prompt}. System: ${input.systemSummary}. Nodes: ${JSON.stringify(input.nodes)}`,
        schema: AiEditSuggestionSchema,
        mock: () =>
          AiEditSuggestionSchema.parse({
            summary: "Add a monitor node and improve naming.",
            changes: [{ action: "addNode", payload: { type: "Monitor", title: "Latency Monitor", x: 500, y: 320 } }],
            assumptions: ["Assumes latency is critical."],
            warnings: [],
          }),
      });
    },
  };
}
