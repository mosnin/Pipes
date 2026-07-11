import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerApp } from "@/lib/composition/server";
import { failure, safeFailure, success } from "@/lib/api/response";
import { RoleSchema } from "@/domain/looper_schema_v1/schema";

const InviteSchema = z.object({
  email: z.string().email(),
  role: RoleSchema,
});

export async function GET() {
  try {
    const { ctx, services } = await getServerApp();
    return NextResponse.json(success((await services.collaboration.list(ctx)).invites));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const raw = await request.json();
    const parsed = InviteSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid invite parameters"), { status: 422 });
    }
    await services.collaboration.invite(ctx, parsed.data.email, parsed.data.role);
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}
