import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/errors";
import { resolveAuthMode } from "@/lib/auth";
import { getAuth } from "@/lib/auth/server";
import { getServerApp } from "@/lib/composition/server";

/** The signed-in person: name, email, role, and whether they sign in with a Pipes password. */
export async function GET(request: Request) {
  try {
    const { identity, ctx } = await getServerApp();
    const mode = resolveAuthMode();
    let hasPassword = false;
    if (mode === "password" || mode === "auth0") {
      const accounts = await (await getAuth()).api.listUserAccounts({ headers: request.headers });
      hasPassword = accounts.some((a) => a.providerId === "credential");
    }
    return NextResponse.json({ ok: true, data: { name: identity.name, email: identity.email, role: ctx.role, plan: ctx.plan, authMode: mode, hasPassword } });
  } catch (error) {
    return apiError(error);
  }
}

/** Update your display name: { name } */
export async function PUT(request: Request) {
  try {
    const { identity, repositories } = await getServerApp();
    const body = await request.json().catch(() => ({}));
    const name = String(body.name ?? "").trim().slice(0, 80);
    if (!name) return NextResponse.json({ ok: false, error: "Enter your name." }, { status: 400 });
    await repositories.users.rename(identity.externalId, name);
    const mode = resolveAuthMode();
    if (mode === "password" || mode === "auth0") await (await getAuth()).api.updateUser({ headers: request.headers, body: { name } });
    return NextResponse.json({ ok: true, data: { name } });
  } catch (error) {
    return apiError(error);
  }
}
