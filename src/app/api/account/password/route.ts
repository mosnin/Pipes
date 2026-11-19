import { NextResponse } from "next/server";
import { createAccountService } from "@/domain/services/accounts";
import { createSecurityService } from "@/domain/auth/security";
import { currentRequestMeta } from "@/lib/auth";
import { getServerApp } from "@/lib/composition/server";
import { apiError } from "@/lib/api/errors";

/** Change your password: { currentPassword, newPassword }. Signs out every other session. */
export async function POST(request: Request) {
  try {
    const { identity, repositories } = await getServerApp();
    const body = await request.json().catch(() => ({}));
    const meta = await currentRequestMeta();
    const result = await createAccountService(repositories).changePassword(identity.email, String(body.currentPassword ?? ""), String(body.newPassword ?? ""), meta);
    if (!result.ok) return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
    const signedOut = await createSecurityService(repositories).revokeAll(identity.externalId, "password_changed", identity.sid, meta);
    return NextResponse.json({ ok: true, data: { changed: true, signedOut } });
  } catch (error) {
    return apiError(error);
  }
}
