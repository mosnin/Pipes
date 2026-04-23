import { NextResponse } from "next/server";
import { success, failure } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";

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
    const body = await request.json();
    await services.collaboration.invite(ctx, body.email, body.role);
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    await services.collaboration.updateMemberRole(ctx, body.userId, body.role);
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
