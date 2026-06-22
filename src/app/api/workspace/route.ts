import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerApp } from "@/lib/composition/server";
import { success, failure } from "@/lib/api/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { ctx, services } = await getServerApp();
  const ws = await services.workspace.get(ctx.workspaceId);
  if (!ws) return NextResponse.json(failure("not_found"), { status: 404 });
  return NextResponse.json(success(ws));
}

const PatchBody = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(280).optional(),
});

export async function PATCH(request: Request) {
  const { ctx, services } = await getServerApp();
  let body: z.infer<typeof PatchBody>;
  try {
    const json = await request.json();
    const result = PatchBody.safeParse(json);
    if (!result.success) {
      return NextResponse.json(failure(result.error.issues[0]?.message ?? "Invalid body"), { status: 400 });
    }
    body = result.data;
  } catch {
    return NextResponse.json(failure("Invalid JSON"), { status: 400 });
  }

  try {
    await services.workspace.update(ctx.workspaceId, body);
    const ws = await services.workspace.get(ctx.workspaceId);
    return NextResponse.json(success(ws));
  } catch (err) {
    return NextResponse.json(failure((err as Error).message), { status: 400 });
  }
}
