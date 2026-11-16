import { NextResponse } from "next/server";
import { createAccountService } from "@/domain/services/accounts";
import { resolveAuthMode, setSessionCookie } from "@/lib/auth";
import { getServerApp } from "@/lib/composition/server";

/** The signed-in person: name, email, role, and whether they have a Pipes password. */
export async function GET() {
  try {
    const { identity, ctx, repositories } = await getServerApp();
    const hasPassword = await createAccountService(repositories).hasPassword(identity.email);
    return NextResponse.json({ ok: true, data: { name: identity.name, email: identity.email, role: ctx.role, plan: ctx.plan, authMode: resolveAuthMode(), hasPassword } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}

/** Update your display name: { name } */
export async function PUT(request: Request) {
  try {
    const { identity, repositories } = await getServerApp();
    const body = await request.json().catch(() => ({}));
    const result = await createAccountService(repositories).rename(identity, String(body.name ?? ""));
    if (!result.ok) return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
    if (resolveAuthMode() !== "mock") await setSessionCookie({ ...identity, name: result.name });
    return NextResponse.json({ ok: true, data: { name: result.name } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
