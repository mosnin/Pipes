import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { runtimeFlags } from "@/lib/env";
import { runOpenRouterBuild, type AgentLoopContext } from "@/lib/ai/openrouter";
import { runHeuristicBuild } from "@/lib/ai/heuristic_build";

export const runtime = "nodejs";

// Server-side "generate and persist". Runs the same build generator the editor
// streams (OpenRouter when keyed, else the keyless heuristic) but applies every
// action to the graph on the server, resolving client node ids to real ids.
// This is what lets a read-only surface (mobile) fire the magic moment: it
// describes a loop, the server builds and saves it, the canvas reloads.
export async function POST(req: Request, { params }: { params: Promise<{ systemId: string }> }) {
  const { systemId } = await params;
  const { ctx, services } = await getServerApp();
  const { prompt } = (await req.json()) as { prompt?: string };
  if (!prompt?.trim()) {
    return NextResponse.json({ ok: false, error: "Prompt is required." }, { status: 400 });
  }

  try {
    services.access.ensureCanEdit(ctx);

    let context: Pick<AgentLoopContext, "existingNodes" | "existingPipes" | "systemName"> = {
      existingNodes: [],
      existingPipes: [],
    };
    try {
      const bundle = await services.systems.getBundle(ctx, systemId);
      context = {
        systemName: bundle.system.name,
        existingNodes: bundle.nodes.map((n: { id: string; type: string; title: string }) => ({ id: n.id, type: n.type, title: n.title })),
        existingPipes: bundle.pipes
          .map((p: { fromNodeId?: string; toNodeId?: string }) => ({ fromNodeId: p.fromNodeId ?? "", toNodeId: p.toNodeId ?? "" }))
          .filter((p) => p.fromNodeId && p.toNodeId),
      };
    } catch {
      /* new/empty system */
    }

    const gen = runtimeFlags.hasOpenRouter
      ? runOpenRouterBuild({ systemId, prompt, ...context })
      : runHeuristicBuild({ systemId, prompt, ...context });

    // Client node id -> persisted node id.
    const idMap = new Map<string, string>();
    let applied = 0;

    for await (const ev of gen) {
      if (ev.kind !== "tool_result" || !ev.ok || !ev.action) continue;
      const a = ev.action;
      if (a.action === "addNode") {
        const realId = (await services.graph.mutate(ctx, {
          action: "addNode",
          systemId,
          type: a.type,
          title: a.title,
          description: a.description,
          x: a.x,
          y: a.y,
        })) as string;
        if (a.clientNodeId) idMap.set(a.clientNodeId, String(realId));
        applied++;
      } else if (a.action === "addPipe") {
        const fromNodeId = idMap.get(a.fromNodeId) ?? a.fromNodeId;
        const toNodeId = idMap.get(a.toNodeId) ?? a.toNodeId;
        await services.graph.mutate(ctx, { action: "addPipe", systemId, fromNodeId, toNodeId });
        applied++;
      } else if (a.action === "updateNode") {
        const nodeId = idMap.get(a.nodeId) ?? a.nodeId;
        await services.graph.mutate(ctx, { action: "updateNode", nodeId, title: a.title, description: a.description });
      } else if (a.action === "deleteNode") {
        const nodeId = idMap.get(a.nodeId) ?? a.nodeId;
        await services.graph.mutate(ctx, { action: "deleteNode", nodeId });
      }
    }

    return NextResponse.json({ ok: true, data: { applied } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }
}
