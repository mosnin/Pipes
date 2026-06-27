import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";

type Params = { params: Promise<{ systemId: string }> };

const MAX_STEPS = 40;
const MAX_LOOP_ITERS = 3;

// Estimated latency (ms) and token usage per node type — realistic dry-run approximations.
const NODE_LATENCY: Record<string, number> = {
  Input: 40, Trigger: 40, Schedule: 10, Output: 30,
  Agent: 1200, Model: 950, Prompt: 120,
  Tool: 320, ExternalApi: 380, Action: 180,
  Decision: 60, Condition: 60, Router: 80,
  Guardrail: 520, Evaluator: 480, Checkpoint: 200,
  Memory: 110, Datastore: 130, Queue: 90,
  Loop: 80, SubLoop: 80, LoopControl: 60,
  Monitor: 140, Environment: 20, Subsystem: 600,
  HumanApproval: 0, HumanReview: 0,
  Reference: 15, Annotation: 5, Node: 80,
};

const NODE_TOKENS: Record<string, number> = {
  Agent: 520, Model: 480, Prompt: 160,
  Guardrail: 220, Evaluator: 280,
};

function nodeLatency(type: string): number { return NODE_LATENCY[type] ?? 100; }
function nodeTokens(type: string): number { return NODE_TOKENS[type] ?? 0; }
function isAsync(type: string): boolean { return type === "HumanApproval" || type === "HumanReview"; }

export async function POST(request: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { systemId } = await params;
    const body = await request.json().catch(() => ({}));
    const input: Record<string, unknown> = body.input ?? {};

    const bundle = await services.systems.getBundle(ctx, systemId);

    const nodeMap = new Map(bundle.nodes.map((n) => [n.id, n]));
    const adjacency = new Map<string, string[]>();
    for (const node of bundle.nodes) adjacency.set(node.id, []);
    for (const pipe of bundle.pipes) {
      if (pipe.fromNodeId && pipe.toNodeId) {
        adjacency.get(pipe.fromNodeId)?.push(pipe.toNodeId);
      }
    }

    const startedAt = new Date().toISOString();
    const steps: { step: number; nodeId: string; summary: string; latency_ms?: number; token_count?: number }[] = [];
    const loopGuards = new Map<string, number>();

    const startNode = bundle.nodes.find((n) => n.type === "Input" || n.type === "Trigger");
    if (!startNode) {
      return NextResponse.json(success({
        id: `sim_${systemId}`, systemId, startedAt,
        endedAt: new Date().toISOString(), status: "halted", input, steps,
        totalLatencyMs: 0, totalTokens: 0,
        message: "No Input or Trigger node found — add one to run a trace.",
      }));
    }

    let current = startNode;
    let status: "success" | "halted" | "error" = "success";
    let totalLatencyMs = 0;
    let totalTokens = 0;

    for (let idx = 1; idx <= MAX_STEPS && current; idx++) {
      const nextIds = adjacency.get(current.id) ?? [];
      const latency = isAsync(current.type) ? undefined : nodeLatency(current.type);
      const tokens = nodeTokens(current.type);
      if (latency !== undefined) totalLatencyMs += latency;
      totalTokens += tokens;

      if (current.type === "Decision" || current.type === "Condition") {
        const branch = input.decision === "secondary" ? "secondary" : "primary";
        const chosen = branch === "secondary" ? nextIds[1] : nextIds[0];
        steps.push({ step: idx, nodeId: current.id, summary: `Branched at "${current.title}" — took ${branch} path.`, latency_ms: latency, token_count: tokens || undefined });
        const branchNode = nodeMap.get(chosen ?? "");
        if (!branchNode) {
          steps.push({ step: idx + 1, nodeId: current.id, summary: `Stopped: ${branch} branch target not found — graph may be incomplete.` });
          status = "halted";
          break;
        }
        current = branchNode;
        continue;
      }

      if (current.type === "Loop") {
        const count = (loopGuards.get(current.id) ?? 0) + 1;
        loopGuards.set(current.id, count);
        steps.push({ step: idx, nodeId: current.id, summary: `Loop "${current.title}" — iteration ${count}.`, latency_ms: latency, token_count: tokens || undefined });
        if (count > MAX_LOOP_ITERS) {
          steps.push({ step: idx + 1, nodeId: current.id, summary: `Stopped: "${current.title}" reached ${MAX_LOOP_ITERS} traced iterations.` });
          status = "halted";
          break;
        }
        const loopNext = nodeMap.get(nextIds[0] ?? "");
        if (!loopNext) {
          steps.push({ step: idx + 1, nodeId: current.id, summary: `Stopped: loop body node not found — check loop connections.` });
          status = "halted";
          break;
        }
        current = loopNext;
        continue;
      }

      if (isAsync(current.type)) {
        steps.push({ step: idx, nodeId: current.id, summary: `Paused at "${current.title}" — awaiting human response (async).` });
      } else {
        const verb = current.type === "Output" ? "Reached output" : "Traced";
        steps.push({ step: idx, nodeId: current.id, summary: `${verb} ${current.type} "${current.title}".`, latency_ms: latency, token_count: tokens || undefined });
      }

      if (current.type === "Output" || nextIds.length === 0) break;
      const nextNode = nodeMap.get(nextIds[0] ?? "");
      if (!nextNode) {
        steps.push({ step: idx + 1, nodeId: current.id, summary: `Stopped: next node not found — graph may have a broken pipe.` });
        status = "halted";
        break;
      }
      current = nextNode;
    }

    return NextResponse.json(success({
      id: `sim_${systemId}`, systemId, startedAt,
      endedAt: new Date().toISOString(), status, input, steps,
      totalLatencyMs, totalTokens,
    }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
