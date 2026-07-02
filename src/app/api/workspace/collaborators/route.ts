import { NextResponse } from "next/server";
import { z } from "zod";
import { success, failure } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";
import { RoleSchema } from "@/domain/looper_schema_v1/schema";

const InviteSchema = z.object({
  email: z.string().email(),
  role: RoleSchema,
});

const UpdateRoleSchema = z.object({
  userId: z.string(),
  role: RoleSchema,
});

const RemoveMemberSchema = z.object({
  userId: z.string(),
  remove: z.literal(true),
});

export async function GET(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? undefined;
    const role = (url.searchParams.get("role") ?? "all") as any;
    return NextResponse.json(success(await services.governance.memberDirectory(ctx, { q, role })));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
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
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const raw = await request.json();
    const parsed = UpdateRoleSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid role update parameters"), { status: 422 });
    }
    await services.collaboration.updateMemberRole(ctx, parsed.data.userId, parsed.data.role);
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const raw = await request.json();
    const parsed = RemoveMemberSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid parameters"), { status: 422 });
    }
    await services.collaboration.removeMember(ctx, parsed.data.userId);
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
