import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerApp } from "@/lib/composition/server";
import { failure, safeFailure, success } from "@/lib/api/response";

const SuggestSchema = z.object({
  apply: z.literal(false).optional(),
  systemId: z.string(),
  prompt: z.string().min(1).max(4000),
});

const ApplySchema = z.object({
  apply: z.literal(true),
  systemId: z.string(),
  suggestion: z.unknown(),
  acceptedChangeIds: z.array(z.string()).optional(),
});

const RequestSchema = z.union([ApplySchema, SuggestSchema]);

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const raw = await request.json();
    const parsed = RequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid suggest-edits request"), { status: 422 });
    }
    const body = parsed.data;
    if (body.apply === true) {
      return NextResponse.json(success(await services.ai.applyEdits(ctx, body.systemId, body.suggestion, body.acceptedChangeIds)));
    }
    return NextResponse.json(success(await services.ai.suggestEdits(ctx, body.systemId, body.prompt)));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}
