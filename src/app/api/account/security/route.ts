import { NextResponse } from "next/server";
import { createSecurityService } from "@/domain/auth/security";
import { createAccountService } from "@/domain/services/accounts";
import { currentRequestMeta, resolveAuthMode } from "@/lib/auth";
import { getServerApp } from "@/lib/composition/server";
import { apiError } from "@/lib/api/errors";

/**
 * Your sign-in security (docs/security.md): live sessions with the current
 * one marked, two-step sign-in status, and your recent security activity.
 * Reachable while a policy is blocking you, so you can fix what it asks.
 */
export async function GET() {
  try {
    const { identity, repositories, policy } = await getServerApp({ skipPolicy: true });
    const security = createSecurityService(repositories);
    const accounts = createAccountService(repositories);
    const mode = resolveAuthMode();
    const [sessions, events, mfaEnabled, recoveryLeft] = await Promise.all([
      security.listSessions(identity.externalId),
      security.eventsFor(identity.externalId, 30),
      accounts.mfaEnabled(identity.email),
      accounts.recoveryCodesLeft(identity.email)
    ]);
    return NextResponse.json({
      ok: true,
      data: {
        mode,
        sessions: sessions.map((s) => ({ id: s.id, createdAt: s.createdAt, lastSeenAt: s.lastSeenAt, ip: s.ip, userAgent: s.userAgent, mfa: s.mfa, current: s.id === identity.sid })),
        events: events.map((e) => ({ id: e.id, at: e.at, type: e.type, ip: e.ip, userAgent: e.userAgent, detail: e.detail })),
        mfa: { available: mode === "password", enabled: mfaEnabled, recoveryLeft, required: policy.requireMfa }
      }
    });
  } catch (error) {
    return apiError(error);
  }
}

/** Sign out a session: DELETE ?id=, or ?scope=others for every session but this one. */
export async function DELETE(request: Request) {
  try {
    const { identity, repositories } = await getServerApp({ skipPolicy: true });
    const security = createSecurityService(repositories);
    const url = new URL(request.url);
    const meta = await currentRequestMeta();
    if (url.searchParams.get("scope") === "others") {
      const count = await security.revokeAll(identity.externalId, "signed_out_elsewhere", identity.sid, meta);
      return NextResponse.json({ ok: true, data: { signedOut: count } });
    }
    const ok = await security.revoke(identity.externalId, url.searchParams.get("id") ?? "", "signed_out_by_user", meta);
    return NextResponse.json(ok ? { ok: true, data: { signedOut: 1 } } : { ok: false, error: "That session has already ended." }, { status: ok ? 200 : 404 });
  } catch (error) {
    return apiError(error);
  }
}
