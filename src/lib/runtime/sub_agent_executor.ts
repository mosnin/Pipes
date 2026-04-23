import type { SubAgentTask } from "@/domain/agent_builder/sub_agents";
import type { SubAgentExecutionRequest, SubAgentProviderOutput } from "@/lib/ai/sub_agents";
import { getSubAgentProvider } from "@/lib/ai/sub_agents";

export type SubAgentExecutionResult = {
  output: SubAgentProviderOutput;
  metadata: { executionMode: "inline" | "modal_ready_inline"; provider: "mock" | "openai" };
};

export interface SubAgentExecutor {
  execute(input: SubAgentExecutionRequest & { task: Pick<SubAgentTask, "id" | "runId"> }): Promise<SubAgentExecutionResult>;
}

export class InlineSubAgentExecutor implements SubAgentExecutor {
  async execute(input: SubAgentExecutionRequest & { task: Pick<SubAgentTask, "id" | "runId"> }): Promise<SubAgentExecutionResult> {
    const provider = getSubAgentProvider();
    const output = await provider.execute(input);
    return { output, metadata: { executionMode: "inline", provider: provider.constructor.name.includes("OpenAi") ? "openai" : "mock" } };
  }
}

export class ModalReadySubAgentExecutor implements SubAgentExecutor {
  constructor(private readonly inline: SubAgentExecutor = new InlineSubAgentExecutor()) {}
  async execute(input: SubAgentExecutionRequest & { task: Pick<SubAgentTask, "id" | "runId"> }): Promise<SubAgentExecutionResult> {
    // Explicit seam: dispatch can offload to Modal in future without changing service contract.
    const result = await this.inline.execute(input);
    return { ...result, metadata: { ...result.metadata, executionMode: "modal_ready_inline" } };
  }
}
