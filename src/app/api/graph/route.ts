import { NextResponse } from "next/server";
import { z } from "zod";
import { failure, safeFailure, success } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";

const PositionSchema = z.object({ x: z.number(), y: z.number() });

const GraphActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("addNode"),
    systemId: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    clientNodeId: z.string().optional(),
  }),
  z.object({
    action: z.literal("updateNode"),
    systemId: z.string(),
    nodeId: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    position: PositionSchema.optional(),
    config: z.record(z.unknown()).optional(),
  }),
  z.object({ action: z.literal("deleteNode"), systemId: z.string(), nodeId: z.string() }),
  z.object({
    action: z.literal("addPipe"),
    systemId: z.string(),
    fromNodeId: z.string(),
    toNodeId: z.string(),
    clientPipeId: z.string().optional(),
  }),
  z.object({ action: z.literal("deletePipe"), systemId: z.string(), pipeId: z.string() }),
]);

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const raw = await request.json();
    const parsed = GraphActionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid graph action"), { status: 422 });
    }
    const result = await services.graph.mutate(ctx, parsed.data);
    return NextResponse.json(success({ ok: true, result }));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}
