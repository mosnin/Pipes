import { NextResponse } from "next/server";
import { success, failure } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";
import { AccessDenied } from "@/domain/permissions";
import { apiError } from "@/lib/api/errors";

export async function GET(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? undefined;
    const role = (url.searchParams.get("role") ?? "all") as any;
    return NextResponse.json(success(await services.governance.memberDirectory(ctx, { q, role })));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    await services.collaboration.invite(ctx, body.email, body.role);
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    if (body.action === "transfer_ownership") await services.collaboration.transferOwnership(ctx, String(body.userId ?? ""));
    else await services.collaboration.updateMemberRole(ctx, body.userId, body.role);
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return fail(error);
  }
}

/** Remove a member: DELETE ?userId=. */
export async function DELETE(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    await services.collaboration.removeMember(ctx, new URL(request.url).searchParams.get("userId") ?? "");
    return NextResponse.json(success({ ok: true }));
  } catch (error) {
    return fail(error);
  }
}

function fail(error: unknown) {
  return apiError(error);
}
