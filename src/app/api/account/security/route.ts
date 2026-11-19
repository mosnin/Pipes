import { NextResponse } from "next/server";
import { createSecurityService } from "@/domain/auth/security";
import { apiError } from "@/lib/api/errors";
import { resolveAuthMode } from "@/lib/auth";
import { getAuth } from "@/lib/auth/server";
import { getServerApp } from "@/lib/composition/server";

/**
 * Your sign-in security (docs/security.md): live sessions with this one
 * marked, two-step sign-in status, and your recent security activity.
 * Session tokens never leave the server; the browser sees session ids.
 * Reachable while a workspace policy is blocking you, so you can fix it.
 */
export async function GET(request: Request) {
  try {
    const { identity, repositories, policy } = await getServerApp({ skipPolicy: true });
    const mode = resolveAuthMode();
    const events = await createSecurityService(repositories).eventsFor(identity.externalId, 30);
    if (mode !== "password" && mode !== "auth0") {
      return NextResponse.json({ ok: true, data: { mode, sessions: [], events: [], mfa: { available: false, enabled: false, recoveryLeft: 0, required: policy.requireMfa } } });
    }
    const auth = await getAuth();
    const [sessions, current] = await Promise.all([auth.api.listSessions({ headers: request.headers }), auth.api.getSession({ headers: request.headers })]);
    const userId = current?.user.id;
    const twoFactor = userId ? await (await auth.$context).adapter.findOne<{ backupCodes: string }>({ model: "twoFactor", where: [{ field: "userId", value: userId }] }) : null;
    const enabled = Boolean((current?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled);
    return NextResponse.json({
      ok: true,
      data: {
        mode,
        sessions: sessions
          .map((s) => ({ id: s.id, createdAt: new Date(s.createdAt).toISOString(), lastSeenAt: new Date(s.updatedAt).toISOString(), ip: s.ipAddress ?? undefined, userAgent: s.userAgent ?? undefined, mfa: Boolean((s as { mfa?: boolean }).mfa), current: s.id === identity.sid }))
          .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt)),
        events: events.map((e) => ({ id: e.id, at: e.at, type: e.type, ip: e.ip, userAgent: e.userAgent, detail: e.detail })),
        mfa: { available: mode === "password", enabled, recoveryLeft: enabled && twoFactor ? (JSON.parse(twoFactor.backupCodes || "[]") as string[]).length : 0, required: policy.requireMfa }
      }
    });
  } catch (error) {
    return apiError(error);
  }
}

/** Sign out a session: DELETE ?id=, or ?scope=others for every session but this one. */
export async function DELETE(request: Request) {
  try {
    await getServerApp({ skipPolicy: true });
    const auth = await getAuth();
    const url = new URL(request.url);
    if (url.searchParams.get("scope") === "others") {
      const before = await auth.api.listSessions({ headers: request.headers });
      await auth.api.revokeOtherSessions({ headers: request.headers });
      return NextResponse.json({ ok: true, data: { signedOut: Math.max(0, before.length - 1) } });
    }
    const target = (await auth.api.listSessions({ headers: request.headers })).find((s) => s.id === url.searchParams.get("id"));
    if (!target) return NextResponse.json({ ok: false, error: "That session has already ended." }, { status: 404 });
    await auth.api.revokeSession({ headers: request.headers, body: { token: target.token } });
    return NextResponse.json({ ok: true, data: { signedOut: 1 } });
  } catch (error) {
    return apiError(error);
  }
}
