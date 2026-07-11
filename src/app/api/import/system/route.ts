import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerApp } from "@/lib/composition/server";
import { failure, safeFailure, success } from "@/lib/api/response";

const ImportModeSchema = z.enum(["new", "existing"]);
const MergeStrategySchema = z.enum(["safe_upsert", "replace_conflicts"]);

const ImportBodySchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("new"),
    schema: z.string(),
    targetSystemId: z.string().optional(),
  }),
  z.object({
    mode: z.literal("existing"),
    schema: z.string(),
    targetSystemId: z.string(),
    preview: z.boolean().optional(),
    applyMerge: z.boolean().optional(),
    plan: z.unknown().optional(),
    strategy: MergeStrategySchema.optional(),
  }),
]);

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const raw = await request.json();
    const parsed = ImportBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid import parameters"), { status: 422 });
    }
    const body = parsed.data;
    if (body.mode === "existing" && body.preview) {
      return NextResponse.json(success(await services.importExport.planMerge(ctx, body.schema, body.targetSystemId)));
    }
    if (body.mode === "existing" && body.applyMerge) {
      return NextResponse.json(success(await services.importExport.applyMerge(ctx, body.plan, body.strategy ?? "safe_upsert")));
    }
    return NextResponse.json(success(await services.importExport.importSchema(ctx, body.schema, body.mode, body.targetSystemId)));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}
