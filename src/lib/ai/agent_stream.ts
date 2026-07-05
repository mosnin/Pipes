import { env, runtimeFlags } from "@/lib/env";
import { GraphActionPayloadSchema, type GraphActionPayload } from "@/domain/agent_builder/actions";

type AgentStreamTextChunk = { type: "text_delta"; text: string };
type AgentStreamActionChunk = { type: "action_proposal"; action: GraphActionPayload; rationale: string };
export type AgentStreamChunk = AgentStreamTextChunk | AgentStreamActionChunk;

export type AgentStreamContext = {
  systemName?: string;
  systemDescription?: string;
  systemId?: string;
  message: string;
  nodeIds?: string[];
  pipeIds?: string[];
};

export interface AgentStreamingProvider {
  streamBuilderResponse(input: AgentStreamContext): AsyncGenerator<AgentStreamChunk>;
}

class MockStreamingProvider implements AgentStreamingProvider {
  async *streamBuilderResponse(input: AgentStreamContext): AsyncGenerator<AgentStreamChunk> {
    const text = `Plan for ${input.systemName ?? "system"}: I will make one safe auto-apply update and hold destructive actions for review.`;
    for (const token of text.split(" ")) {
      await new Promise((resolve) => setTimeout(resolve, 15));
      yield { type: "text_delta", text: `${token} ` };
    }
    yield { type: "action_proposal", rationale: "Add an annotation note to mark the next reliability checkpoint.", action: { actionType: "add_annotation", body: "Agent note: add retry and observability guardrails.", nodeId: input.nodeIds?.[0] } };
    if (input.nodeIds?.[0]) {
      yield { type: "action_proposal", rationale: "Deleting nodes is risky and needs review.", action: { actionType: "delete_node", nodeId: input.nodeIds[0] } };
    }
  }
}

class OpenAiStreamingProvider implements AgentStreamingProvider {
  async *streamBuilderResponse(input: AgentStreamContext): AsyncGenerator<AgentStreamChunk> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        stream: true,
        temperature: 0.2,
        messages: [
          { role: "system", content: "You are Pipes system-building assistant. Explain intent and expected impact succinctly." },
          { role: "user", content: `System: ${input.systemName ?? "Untitled"}. Summary: ${input.systemDescription ?? ""}. Request: ${input.message}` }
        ]
      })
    });
    if (!response.ok || !response.body) throw new Error("openai_stream_failed");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") break;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (delta) yield { type: "text_delta", text: delta };
        } catch {
          continue;
        }
      }
    }

    const actionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        temperature: 0,
        messages: [
          { role: "system", content: "Return strict JSON with key actions. Actions must use allowed actionType values only." },
          { role: "user", content: `Request: ${input.message}\nSystemId:${input.systemId ?? "unknown"}\nNodeIds:${(input.nodeIds ?? []).join(",")}\nPipeIds:${(input.pipeIds ?? []).join(",")}` }
        ],
        response_format: { type: "json_object" }
      })
    });
    if (!actionResponse.ok) return;
    const parsed = await actionResponse.json();
    const content = parsed?.choices?.[0]?.message?.content;
    if (!content) return;
    try {
      const obj = JSON.parse(content);
      const actions = Array.isArray(obj.actions) ? obj.actions : [];
      for (const row of actions.slice(0, 5)) {
        const action = GraphActionPayloadSchema.parse(row.action);
        yield { type: "action_proposal", action, rationale: String(row.rationale ?? "Model suggested this action.") };
      }
    } catch {
      return;
    }
  }
}

export function getAgentStreamingProvider(): AgentStreamingProvider {
  if (runtimeFlags.useMocks || !runtimeFlags.hasOpenAI) return new MockStreamingProvider();
  return new OpenAiStreamingProvider();
}
