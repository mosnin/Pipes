import { afterEach, describe, expect, it, vi } from "vitest";
import { runOpenRouterBuild, type AgentLoopEvent } from "@/lib/ai/openrouter";

// A scripted OpenRouter conversation: the model narrates, adds three nodes,
// wires two pipes (referencing nodes by title — the loop resolves these to the
// ids it assigned), validates, then finishes with a final message.
function scriptedResponses() {
  const toolCall = (id: string, name: string, args: unknown) => ({
    id,
    type: "function",
    function: { name, arguments: JSON.stringify(args) },
  });

  return [
    {
      choices: [
        {
          message: {
            content: "Building a small three-node loop.",
            tool_calls: [
              toolCall("c1", "add_node", { type: "Input", title: "Inbound", description: "User question", x: 240, y: 180 }),
              toolCall("c2", "add_node", { type: "Agent", title: "Worker", description: "Does the work", x: 460, y: 180 }),
              toolCall("c3", "add_node", { type: "Output", title: "Reply", description: "Final reply", x: 680, y: 180 }),
            ],
          },
        },
      ],
    },
    {
      choices: [
        {
          message: {
            content: null,
            tool_calls: [
              toolCall("c4", "add_pipe", { fromNodeId: "Inbound", toNodeId: "Worker" }),
              toolCall("c5", "add_pipe", { fromNodeId: "Worker", toNodeId: "Reply" }),
            ],
          },
        },
      ],
    },
    {
      choices: [{ message: { content: null, tool_calls: [toolCall("c6", "validate", {})] } }],
    },
    {
      choices: [{ message: { content: "Done. Three nodes wired into a loop.", tool_calls: [] } }],
    },
  ];
}

function installFetchScript(responses: unknown[]) {
  let i = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const body = responses[Math.min(i, responses.length - 1)];
      i++;
      return {
        ok: true,
        json: async () => body,
        text: async () => JSON.stringify(body),
      } as unknown as Response;
    }),
  );
}

async function collect(gen: AsyncGenerator<AgentLoopEvent>): Promise<AgentLoopEvent[]> {
  const out: AgentLoopEvent[] = [];
  for await (const ev of gen) out.push(ev);
  return out;
}

describe("runOpenRouterBuild", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("emits add_node actions with client ids and wires pipes by resolved reference", async () => {
    installFetchScript(scriptedResponses());
    const events = await collect(
      runOpenRouterBuild({ systemId: "sys_test", prompt: "Build a Q&A loop", systemName: "Test" }),
    );

    const addNodes = events.filter(
      (e): e is Extract<AgentLoopEvent, { kind: "tool_result" }> =>
        e.kind === "tool_result" && e.action?.action === "addNode",
    );
    expect(addNodes).toHaveLength(3);
    const clientIds = addNodes.map((e) => (e.action as { clientNodeId: string }).clientNodeId);
    // Every add_node action carries a unique client id.
    expect(new Set(clientIds).size).toBe(3);

    const addPipes = events.filter(
      (e): e is Extract<AgentLoopEvent, { kind: "tool_result" }> =>
        e.kind === "tool_result" && e.action?.action === "addPipe",
    );
    expect(addPipes).toHaveLength(2);
    // Pipes reference the ids the loop assigned (resolved from titles).
    for (const pipe of addPipes) {
      const a = pipe.action as { fromNodeId: string; toNodeId: string };
      expect(clientIds).toContain(a.fromNodeId);
      expect(clientIds).toContain(a.toNodeId);
    }
  });

  it("validates the planned graph and finishes with a final message", async () => {
    installFetchScript(scriptedResponses());
    const events = await collect(
      runOpenRouterBuild({ systemId: "sys_test", prompt: "Build a Q&A loop" }),
    );

    const validate = events.find(
      (e): e is Extract<AgentLoopEvent, { kind: "tool_result" }> =>
        e.kind === "tool_result" && e.id === "c6",
    );
    // A complete loop (Input + Output + all connected) passes validation.
    expect(validate?.ok).toBe(true);

    const messages = events.filter((e) => e.kind === "message");
    expect(messages.at(-1)).toMatchObject({ kind: "message", text: "Done. Three nodes wired into a loop." });
  });

  it("surfaces a retryable error when OpenRouter fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503, text: async () => "upstream down" }) as unknown as Response),
    );
    const events = await collect(runOpenRouterBuild({ systemId: "sys_test", prompt: "x" }));
    expect(events.at(-1)).toMatchObject({ kind: "error", retryable: true });
  });
});
