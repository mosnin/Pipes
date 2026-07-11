import type { AgentLoopEvent, AgentLoopContext } from "@/lib/ai/openrouter";

// ---------------------------------------------------------------------------
// Heuristic loop builder
//
// The keyless default. When no OpenRouter key is configured, this replaces the
// old 2-node fixture cartoon with a prompt-tailored loop: it reads the request
// for domain signals and assembles a representative pipeline so different
// prompts produce different, plausible graphs. Deterministic, no network.
//
// It yields the exact same AgentLoopEvent stream as the real OpenRouter loop,
// so the build route maps it to SSE identically.
// ---------------------------------------------------------------------------

type Stage = { type: string; title: string; description: string };

const SIGNALS: Array<{ test: RegExp; stage: Stage }> = [
  { test: /classif|triage|categor|route|intent|sort/i, stage: { type: "Router", title: "Classifier", description: "Classifies the input and routes it." } },
  { test: /search|research|retriev|lookup|knowledge|index|rag|fetch context/i, stage: { type: "Tool", title: "Retriever", description: "Pulls relevant context from a source." } },
  { test: /enrich|profile|augment|append data/i, stage: { type: "Tool", title: "Enrichment", description: "Enriches the record with extra data." } },
  { test: /summar|synthesi|draft|write|generat|compose|content|reply|respond/i, stage: { type: "Agent", title: "Synthesizer", description: "Produces the working output." } },
  { test: /review|critiqu|evaluat|score|quality|grade|rubric|confiden/i, stage: { type: "Evaluator", title: "Evaluator", description: "Scores the output against criteria." } },
  { test: /guard|policy|safe|moderat|complian|filter|sanitiz/i, stage: { type: "Guardrail", title: "Guardrail", description: "Enforces policy before anything proceeds." } },
  { test: /approv|human|escalat|sign.?off|manual review|on.?call/i, stage: { type: "HumanReview", title: "Human Review", description: "Holds for a human decision when needed." } },
  { test: /api|webhook|external|http|third.?party|integration/i, stage: { type: "ExternalApi", title: "External API", description: "Calls an external service." } },
  { test: /store|database|persist|save|record|crm|write.?back|log/i, stage: { type: "Datastore", title: "Datastore", description: "Persists the result." } },
];

const LOOP_SIGNAL = /loop|iterat|retry|until|repeat|refine|revise|again/i;

function detectStages(prompt: string): Stage[] {
  const stages: Stage[] = [];
  const seen = new Set<string>();
  for (const { test, stage } of SIGNALS) {
    if (test.test(prompt) && !seen.has(stage.type)) {
      stages.push(stage);
      seen.add(stage.type);
    }
  }
  // Guarantee a meaningful middle: every loop needs at least one worker.
  if (!stages.some((s) => s.type === "Agent")) {
    stages.unshift({ type: "Agent", title: "Worker", description: "Performs the core step of the loop." });
  }
  // Keep it readable.
  return stages.slice(0, 6);
}

function rid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function* runHeuristicBuild(input: AgentLoopContext): AsyncGenerator<AgentLoopEvent> {
  const prompt = input.prompt;
  const stages = detectStages(prompt);
  const hasLoop = LOOP_SIGNAL.test(prompt);

  // Full ordered node list: Input -> detected stages -> (LoopControl?) -> Output.
  const plan: Stage[] = [
    { type: "Input", title: "Inbound", description: "Entry point for the loop." },
    ...stages,
  ];
  if (hasLoop) {
    plan.push({ type: "LoopControl", title: "Loop Control", description: "Repeats until the stop condition is met." });
  }
  plan.push({ type: "Output", title: "Result", description: "Final output of the loop." });

  yield { kind: "status", state: "thinking" };
  yield {
    kind: "message",
    text: `Sketching a ${plan.length}-step loop: ${plan.map((p) => p.title).join(" -> ")}.`,
  };

  // Emit nodes left to right.
  const ids: string[] = [];
  let tcId = 0;
  for (let i = 0; i < plan.length; i++) {
    const stage = plan[i];
    const x = 240 + (i % 6) * 220;
    const y = 180 + Math.floor(i / 6) * 160;
    const clientNodeId = rid("tmp");
    ids.push(clientNodeId);
    const callId = `hc_${tcId++}`;
    yield { kind: "status", state: "calling_tool", tool: "add_node" };
    yield { kind: "tool_call", id: callId, tool: "add_node", args: { type: stage.type, title: stage.title, description: stage.description, x, y } };
    yield {
      kind: "tool_result",
      id: callId,
      ok: true,
      action: { action: "addNode", systemId: input.systemId, type: stage.type, title: stage.title, description: stage.description, x, y, clientNodeId },
      data: { ok: true, node_id: clientNodeId },
    };
  }

  // Connect sequentially.
  for (let i = 0; i < ids.length - 1; i++) {
    const callId = `hc_${tcId++}`;
    yield { kind: "status", state: "calling_tool", tool: "add_pipe" };
    yield { kind: "tool_call", id: callId, tool: "add_pipe", args: { fromNodeId: ids[i], toNodeId: ids[i + 1] } };
    yield {
      kind: "tool_result",
      id: callId,
      ok: true,
      action: { action: "addPipe", systemId: input.systemId, fromNodeId: ids[i], toNodeId: ids[i + 1], clientPipeId: rid("tmp_pipe") },
      data: { ok: true },
    };
  }

  // If the loop iterates, wire the LoopControl back to the first worker so the
  // cycle is real, not implied.
  if (hasLoop) {
    const loopIdx = plan.findIndex((p) => p.type === "LoopControl");
    const firstWorkerIdx = 1; // first stage after Input
    if (loopIdx > firstWorkerIdx) {
      const callId = `hc_${tcId++}`;
      yield { kind: "tool_call", id: callId, tool: "add_pipe", args: { fromNodeId: ids[loopIdx], toNodeId: ids[firstWorkerIdx] } };
      yield {
        kind: "tool_result",
        id: callId,
        ok: true,
        action: { action: "addPipe", systemId: input.systemId, fromNodeId: ids[loopIdx], toNodeId: ids[firstWorkerIdx], clientPipeId: rid("tmp_pipe") },
        data: { ok: true },
      };
    }
  }

  yield {
    kind: "message",
    text: `Built a ${plan.length}-node loop. Tell me what to change and I will adjust it.`,
  };
}
