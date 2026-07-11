import { env, DEFAULT_OPENROUTER_MODEL } from "@/lib/env";
import { nodeTypeValues } from "@/domain/looper_schema_v1/schema";
import type { EditorGraphAction } from "@/components/editor/editor_state";

// ---------------------------------------------------------------------------
// OpenRouter agentic loop
//
// A genuine reason-act loop against OpenRouter (OpenAI-compatible chat
// completions + tool calling). The model plans a loop, calls graph tools one
// at a time, observes the result (including the id of each node it creates),
// wires pipes, and can call `validate` to check its own work and self-correct
// before finishing. No SDK: just fetch, so it bundles cleanly in a Next route.
// ---------------------------------------------------------------------------

export type AgentLoopEvent =
  | { kind: "status"; state: "thinking" | "calling_tool" | "writing_message"; tool?: string }
  | { kind: "message"; text: string }
  | { kind: "tool_call"; id: string; tool: AgentToolName; args: Record<string, unknown> }
  | { kind: "tool_result"; id: string; ok: boolean; action?: EditorGraphAction; data?: unknown }
  | { kind: "error"; message: string; retryable: boolean };

export type AgentToolName = "add_node" | "add_pipe" | "update_node" | "delete_node" | "validate";

export type AgentLoopContext = {
  systemId: string;
  prompt: string;
  systemName?: string;
  existingNodes?: Array<{ id: string; type: string; title: string }>;
  existingPipes?: Array<{ fromNodeId: string; toNodeId: string }>;
};

const TOOL_CALL_CAP = 30;
const MAX_TURNS = 14;
const REQUEST_TIMEOUT_MS = 45_000;

// A node the model has planned this run. Tracks the id we assigned so we can
// resolve add_pipe references by id OR by title (resilience against models
// that reference a node by name instead of the returned id).
type PlannedNode = { clientNodeId: string; type: string; title: string; x: number; y: number };

function randId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildSystemPrompt(): string {
  return [
    "You are Pipes' Loop Architect. You build agent loops as typed graphs on a canvas.",
    "",
    "A loop is a directed graph of typed nodes connected by pipes. You build it by calling tools.",
    "",
    "RULES",
    "- Always build a complete, runnable loop: a clear entry (Input or Trigger), the working steps, and an exit (Output).",
    "- Prefer 4 to 8 nodes. Never fewer than 3. Use loop-native steps where they fit: LoopControl, Checkpoint, Evaluator, HumanReview, Guardrail, Router, Decision.",
    "- Add every node BEFORE you connect it. add_node returns the node_id you MUST use in add_pipe.",
    "- Lay nodes left to right. First node at x=240, y=180. Step x by 220 per node. Start a new row by adding 160 to y and resetting x to 240.",
    "- When the graph is built, call validate once. If it reports problems, fix them, then write a one or two sentence summary and stop.",
    "- Keep titles short (1-4 words). Keep descriptions to one sentence.",
    "",
    `AVAILABLE NODE TYPES: ${nodeTypeValues.join(", ")}.`,
    "",
    "Think briefly out loud before acting, then call tools. Do not ask the user questions; make the most plausible choice and build.",
  ].join("\n");
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "add_node",
      description: "Add one typed node to the canvas. Returns the node_id to use when wiring pipes.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", description: "One of the available node types." },
          title: { type: "string", description: "Short label, 1-4 words." },
          description: { type: "string", description: "One sentence on what the node does." },
          x: { type: "number" },
          y: { type: "number" },
        },
        required: ["type", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_pipe",
      description: "Connect two existing nodes. Use node_ids returned by add_node (a title also works).",
      parameters: {
        type: "object",
        properties: {
          fromNodeId: { type: "string" },
          toNodeId: { type: "string" },
        },
        required: ["fromNodeId", "toNodeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_node",
      description: "Rename or re-describe an existing node.",
      parameters: {
        type: "object",
        properties: {
          nodeId: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["nodeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_node",
      description: "Remove a node. Connected pipes are removed with it.",
      parameters: {
        type: "object",
        properties: { nodeId: { type: "string" } },
        required: ["nodeId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "validate",
      description: "Check the loop for orphan nodes, missing entry/exit, and unreachable steps.",
      parameters: { type: "object", properties: {} },
    },
  },
] as const;

type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: RawToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

type RawToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };

async function callOpenRouter(messages: ChatMessage[]): Promise<{
  content: string | null;
  toolCalls: RawToolCall[];
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "content-type": "application/json",
        "X-Title": "Pipes",
        "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL,
        temperature: 0.3,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`openrouter_${res.status}: ${body.slice(0, 200)}`);
    }
    const json = await res.json();
    const choice = json?.choices?.[0]?.message ?? {};
    return {
      content: typeof choice.content === "string" ? choice.content : null,
      toolCalls: Array.isArray(choice.tool_calls) ? (choice.tool_calls as RawToolCall[]) : [],
    };
  } finally {
    clearTimeout(timer);
  }
}

// Lightweight, real validation over the planned graph so the model gets honest
// feedback in its reason-act loop.
function validatePlanned(nodes: PlannedNode[], pipes: Array<{ from: string; to: string }>): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (nodes.length < 3) errors.push("The loop needs at least 3 nodes.");
  const hasEntry = nodes.some((n) => n.type === "Input" || n.type === "Trigger");
  const hasExit = nodes.some((n) => n.type === "Output");
  if (!hasEntry) errors.push("No entry node (add an Input or Trigger).");
  if (!hasExit) errors.push("No exit node (add an Output).");
  const connected = new Set<string>();
  for (const p of pipes) {
    connected.add(p.from);
    connected.add(p.to);
  }
  for (const n of nodes) {
    if (!connected.has(n.clientNodeId)) errors.push(`Node "${n.title}" is not connected to anything.`);
  }
  return { ok: errors.length === 0, errors };
}

/**
 * Run the agentic build loop. Yields normalized events the caller maps to SSE.
 */
export async function* runOpenRouterBuild(input: AgentLoopContext): AsyncGenerator<AgentLoopEvent> {
  const planned: PlannedNode[] = [];
  const plannedPipes: Array<{ from: string; to: string }> = [];
  let toolCallCount = 0;

  // Seed the planner with any existing graph so edits compose with the canvas.
  for (const n of input.existingNodes ?? []) {
    planned.push({ clientNodeId: n.id, type: n.type, title: n.title, x: 0, y: 0 });
  }
  for (const p of input.existingPipes ?? []) {
    plannedPipes.push({ from: p.fromNodeId, to: p.toNodeId });
  }

  const contextLine =
    (input.existingNodes?.length ?? 0) > 0
      ? `The system "${input.systemName ?? "Untitled"}" already has these nodes: ${(input.existingNodes ?? [])
          .map((n) => `${n.title} (${n.type}, id=${n.id})`)
          .join("; ")}. Extend or edit it as requested.`
      : `The system "${input.systemName ?? "Untitled"}" is empty. Build it from scratch.`;

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: `${contextLine}\n\nRequest: ${input.prompt}` },
  ];

  const resolveRef = (ref: unknown): string | null => {
    if (typeof ref !== "string") return null;
    if (planned.some((n) => n.clientNodeId === ref)) return ref;
    const byTitle = planned.find((n) => n.title.toLowerCase() === ref.toLowerCase());
    return byTitle ? byTitle.clientNodeId : ref; // fall through to raw ref (may be an existing server id)
  };

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    yield { kind: "status", state: "thinking" };
    let response: { content: string | null; toolCalls: RawToolCall[] };
    try {
      response = await callOpenRouter(messages);
    } catch (err) {
      yield { kind: "error", message: (err as Error).message, retryable: true };
      return;
    }

    if (response.content && response.content.trim()) {
      yield { kind: "message", text: response.content.trim() };
    }

    if (response.toolCalls.length === 0) {
      // Model is done (final narration already emitted as message).
      return;
    }

    // Record the assistant turn (with its tool calls) so the model has context.
    messages.push({ role: "assistant", content: response.content, tool_calls: response.toolCalls });

    for (const call of response.toolCalls) {
      if (toolCallCount >= TOOL_CALL_CAP) {
        yield { kind: "error", message: "Reached the build action limit.", retryable: false };
        return;
      }
      toolCallCount++;

      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }
      const toolName = call.function.name as AgentToolName;
      yield { kind: "status", state: "calling_tool", tool: toolName };
      yield { kind: "tool_call", id: call.id, tool: toolName, args };

      let action: EditorGraphAction | undefined;
      let resultForModel: Record<string, unknown> = { ok: true };
      let ok = true;

      if (toolName === "add_node") {
        const type = typeof args.type === "string" && nodeTypeValues.includes(args.type as never) ? (args.type as string) : "Node";
        const title = typeof args.title === "string" ? args.title : "Node";
        const description = typeof args.description === "string" ? args.description : undefined;
        const col = planned.length % 6;
        const row = Math.floor(planned.length / 6);
        const x = typeof args.x === "number" ? args.x : 240 + col * 220;
        const y = typeof args.y === "number" ? args.y : 180 + row * 160;
        const clientNodeId = randId("tmp");
        planned.push({ clientNodeId, type, title, x, y });
        action = { action: "addNode", systemId: input.systemId, type, title, description, x, y, clientNodeId };
        resultForModel = { ok: true, node_id: clientNodeId, message: `Added "${title}" as ${clientNodeId}.` };
      } else if (toolName === "add_pipe") {
        const from = resolveRef(args.fromNodeId);
        const to = resolveRef(args.toNodeId);
        if (!from || !to) {
          ok = false;
          resultForModel = { ok: false, error: "Both fromNodeId and toNodeId are required and must reference existing nodes." };
        } else {
          plannedPipes.push({ from, to });
          action = { action: "addPipe", systemId: input.systemId, fromNodeId: from, toNodeId: to, clientPipeId: randId("tmp_pipe") };
          resultForModel = { ok: true, message: "Connected." };
        }
      } else if (toolName === "update_node") {
        const nodeId = resolveRef(args.nodeId);
        if (!nodeId) {
          ok = false;
          resultForModel = { ok: false, error: "nodeId is required." };
        } else {
          action = {
            action: "updateNode",
            nodeId,
            title: typeof args.title === "string" ? args.title : undefined,
            description: typeof args.description === "string" ? args.description : undefined,
          };
          resultForModel = { ok: true, message: "Updated." };
        }
      } else if (toolName === "delete_node") {
        const nodeId = resolveRef(args.nodeId);
        if (!nodeId) {
          ok = false;
          resultForModel = { ok: false, error: "nodeId is required." };
        } else {
          const idx = planned.findIndex((n) => n.clientNodeId === nodeId);
          if (idx >= 0) planned.splice(idx, 1);
          action = { action: "deleteNode", nodeId };
          resultForModel = { ok: true, message: "Deleted." };
        }
      } else if (toolName === "validate") {
        const report = validatePlanned(planned, plannedPipes);
        resultForModel = { ok: report.ok, errors: report.errors };
      } else {
        ok = false;
        resultForModel = { ok: false, error: `Unknown tool ${toolName}.` };
      }

      yield { kind: "tool_result", id: call.id, ok, action, data: resultForModel };
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(resultForModel) });
    }
  }
}
