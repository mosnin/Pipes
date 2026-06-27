import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";

type Params = { params: Promise<{ systemId: string }> };

const MAX_STEPS = 40;
const MAX_LOOP_ITERS = 3;

export async function POST(request: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const { systemId } = await params;
    const body = await request.json().catch(() => ({}));
    const input: Record<string, unknown> = body.input ?? {};

    const bundle = await services.systems.getBundle(ctx, systemId);

    // Build node-based adjacency (pipes already have fromNodeId/toNodeId from getBundle)
    const nodeMap = new Map(bundle.nodes.map((n) => [n.id, n]));
    const adjacency = new Map<string, string[]>();
    for (const node of bundle.nodes) adjacency.set(node.id, []);
    for (const pipe of bundle.pipes) {
      if (pipe.fromNodeId && pipe.toNodeId) {
        adjacency.get(pipe.fromNodeId)?.push(pipe.toNodeId);
      }
    }

    const startedAt = new Date().toISOString();
    const steps: { step: number; nodeId: string; summary: string }[] = [];
    const loopGuards = new Map<string, number>();

    const startNode = bundle.nodes.find((n) => n.type === "Input" || n.type === "Trigger");
    if (!startNode) {
      return NextResponse.json(success({
        id: `sim_${systemId}`,
        systemId,
        startedAt,
        endedAt: new Date().toISOString(),
        status: "halted",
        input,
        steps: [],
        message: "No Input or Trigger node found — add one to run a trace.",
      }));
    }

    let current = startNode;
    let status: "success" | "halted" | "error" = "success";

    for (let idx = 1; idx <= MAX_STEPS && current; idx++) {
      const nextIds = adjacency.get(current.id) ?? [];

      if (current.type === "Decision" || current.type === "Condition") {
        const branch = input.decision === "secondary" ? "secondary" : "primary";
        const chosen = branch === "secondary" ? nextIds[1] : nextIds[0];
        steps.push({ step: idx, nodeId: current.id, summary: `Branched at "${current.title}" — took ${branch} path.` });
        current = nodeMap.get(chosen ?? "") as typeof current;
        continue;
      }

      if (current.type === "Loop") {
        const count = (loopGuards.get(current.id) ?? 0) + 1;
        loopGuards.set(current.id, count);
        steps.push({ step: idx, nodeId: current.id, summary: `Loop "${current.title}" — iteration ${count}.` });
        if (count > MAX_LOOP_ITERS) {
          steps.push({ step: idx + 1, nodeId: current.id, summary: `Stopped: "${current.title}" reached ${MAX_LOOP_ITERS} traced iterations.` });
          status = "halted";
          break;
        }
        current = nodeMap.get(nextIds[0] ?? "") as typeof current;
        continue;
      }

      const verb = current.type === "Output" ? "Reached output" : "Traced";
      steps.push({ step: idx, nodeId: current.id, summary: `${verb} ${current.type} "${current.title}".` });

      if (current.type === "Output" || nextIds.length === 0) break;
      current = nodeMap.get(nextIds[0] ?? "") as typeof current;
    }

    return NextResponse.json(success({
      id: `sim_${systemId}`,
      systemId,
      startedAt,
      endedAt: new Date().toISOString(),
      status,
      input,
      steps,
    }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
