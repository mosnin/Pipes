import { NextResponse } from "next/server";
import { z } from "zod";
import { success, failure, safeFailure } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";

const AddCommentSchema = z.object({
  systemId: z.string(),
  body: z.string().min(1).max(5000),
  nodeId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const raw = await request.json();
    const parsed = AddCommentSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid comment parameters"), { status: 422 });
    }
    await services.comments.add(ctx, parsed.data);
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}
