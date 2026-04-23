import { env } from "@/lib/env";
import type { SubAgentExecutionRequest, SubAgentProviderOutput } from "@/lib/ai/sub_agents";
import { SubAgentProviderOutputSchema } from "@/lib/ai/sub_agents";

export type ModalExecutionResult = { output: SubAgentProviderOutput; jobId?: string; runtime: "modal_worker" | "modal_sandbox" | "fallback_inline" };

export class ModalExecutionService {
  async execute(input: { request: SubAgentExecutionRequest; mode: "worker" | "sandbox" }): Promise<ModalExecutionResult> {
    const endpoint = process.env.MODAL_EXECUTOR_URL;
    if (!endpoint) {
      return { output: SubAgentProviderOutputSchema.parse({ planRefinement: `Fallback modal-${input.mode} output for ${input.request.contextPack.subsystemId}`, critique: "Modal endpoint not configured; fallback result.", openQuestions: [], proposalInputs: [{ actionType: "add_annotation", rationale: "fallback_modal_annotation" }], conflictSignals: [] }), runtime: "fallback_inline" };
    }
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.MODAL_EXECUTOR_TOKEN ?? ""}` },
      body: JSON.stringify({ mode: input.mode, request: input.request })
    });
    if (!res.ok) throw new Error(`modal_execution_failed:${res.status}`);
    const payload = await res.json();
    return { output: SubAgentProviderOutputSchema.parse(payload.output), jobId: payload.jobId, runtime: input.mode === "sandbox" ? "modal_sandbox" : "modal_worker" };
  }
}
