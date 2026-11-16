import { NextResponse } from "next/server";
import { createAccountService } from "@/domain/services/accounts";
import { getServerApp } from "@/lib/composition/server";

/** Change your password: { currentPassword, newPassword } */
export async function POST(request: Request) {
  try {
    const { identity, repositories } = await getServerApp();
    const body = await request.json().catch(() => ({}));
    const result = await createAccountService(repositories).changePassword(identity.email, String(body.currentPassword ?? ""), String(body.newPassword ?? ""));
    if (!result.ok) return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
    return NextResponse.json({ ok: true, data: { changed: true } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 });
  }
}
