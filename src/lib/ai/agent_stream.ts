import { env, runtimeFlags } from "@/lib/env";

export type AgentStreamContext = {
  systemName?: string;
  systemDescription?: string;
  message: string;
};

export interface AgentStreamingProvider {
  streamBuilderResponse(input: AgentStreamContext): AsyncGenerator<string>;
}

class MockStreamingProvider implements AgentStreamingProvider {
  async *streamBuilderResponse(input: AgentStreamContext): AsyncGenerator<string> {
    const text = `Plan for ${input.systemName ?? "system"}: clarify goals, inspect current graph constraints, propose incremental safe changes (no direct graph mutation in this pass), and identify approvals needed for future actions.`;
    for (const token of text.split(" ")) {
      await new Promise((resolve) => setTimeout(resolve, 15));
      yield `${token} `;
    }
  }
}

class OpenAiStreamingProvider implements AgentStreamingProvider {
  async *streamBuilderResponse(input: AgentStreamContext): AsyncGenerator<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        stream: true,
        temperature: 0.2,
        messages: [
          { role: "system", content: "You are Pipes system-building assistant. Discuss planning and rationale only. Do not claim graph mutations are applied." },
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
        if (payload === "[DONE]") return;
        try {
          const parsed = JSON.parse(payload);
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          continue;
        }
      }
    }
  }
}

export function getAgentStreamingProvider(): AgentStreamingProvider {
  if (runtimeFlags.useMocks || !runtimeFlags.hasOpenAI) return new MockStreamingProvider();
  return new OpenAiStreamingProvider();
}
