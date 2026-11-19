import { NextResponse } from "next/server";
import { createSecurityService } from "@/domain/auth/security";
import { createAccountService } from "@/domain/services/accounts";
import { currentRequestMeta } from "@/lib/auth";
import { getServerApp } from "@/lib/composition/server";
import { apiError } from "@/lib/api/errors";

/**
 * Two-step sign-in for your account:
 * { action: "begin" } returns a secret and an otpauth link for the app;
 * { action: "confirm", code } turns it on and returns recovery codes, once;
 * { action: "disable", password, code } turns it off.
 * Reachable while the workspace requires two-step sign-in and you have none yet.
 */
export async function POST(request: Request) {
  try {
    const { identity, repositories, policy } = await getServerApp({ skipPolicy: true });
    const accounts = createAccountService(repositories);
    const body = await request.json().catch(() => ({}));
    const meta = await currentRequestMeta();
    if (body.action === "begin") {
      const result = await accounts.beginMfa(identity.email);
      return NextResponse.json(result.ok ? { ok: true, data: { secret: result.secret, url: result.url } } : { ok: false, error: result.message }, { status: result.ok ? 200 : 400 });
    }
    if (body.action === "confirm") {
      const result = await accounts.confirmMfa(identity.email, String(body.code ?? ""), meta);
      if (!result.ok) return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
      if (identity.sid) await createSecurityService(repositories).markMfa(identity.externalId, identity.sid);
      return NextResponse.json({ ok: true, data: { recoveryCodes: result.recoveryCodes } });
    }
    if (body.action === "disable") {
      if (policy.requireMfa) return NextResponse.json({ ok: false, error: "Your workspace requires two-step sign-in, so it cannot be turned off. Set up a new app by asking an Admin to lift the rule first." }, { status: 403 });
      const result = await accounts.disableMfa(identity.email, String(body.password ?? ""), String(body.code ?? ""), meta);
      return NextResponse.json(result.ok ? { ok: true, data: { enabled: false } } : { ok: false, error: result.message }, { status: result.ok ? 200 : 400 });
    }
    return NextResponse.json({ ok: false, error: "action must be begin, confirm or disable." }, { status: 400 });
  } catch (error) {
    return apiError(error);
  }
}
