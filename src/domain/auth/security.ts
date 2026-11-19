import crypto from "node:crypto";
import type { RepositorySet } from "@/lib/repositories/contracts";

/**
 * Sign-in security, built like the run rails (docs/security.md):
 *
 * - Sessions live on the server. The cookie only names one, so a session can
 *   be revoked, expires when idle, and ends everywhere on a password change.
 * - Failed sign-ins lock an account for a while, and each IP address has its
 *   own limit, so guessing passwords is slow from one place or many.
 * - Every security event goes to an append-only journal (`auth_event`), the
 *   same way every run change goes to the run journal.
 * - Workspaces set policies: two-step sign-in required, session length,
 *   allowed email domains.
 */

export const SESSION_KIND = "auth_session";
export const AUTH_EVENT_KIND = "auth_event";
export const LOCK_KIND = "auth_lock";
export const POLICY_KIND = "security_policy";
const GLOBAL = "global";

export const SESSION_ABSOLUTE_MS = 7 * 24 * 60 * 60 * 1000;
export const DEFAULT_IDLE_MS = 24 * 60 * 60 * 1000;
/** Last-seen is written at most this often, so reads stay cheap. */
const TOUCH_EVERY_MS = 5 * 60 * 1000;

export const LOCKOUT = { failures: 5, windowMs: 15 * 60 * 1000, baseLockMs: 15 * 60 * 1000, maxLockMs: 24 * 60 * 60 * 1000 };
export const IP_LIMIT = { attempts: 30, windowSeconds: 15 * 60 };

export type RequestMeta = { ip?: string; userAgent?: string };

export type AuthSession = {
  id: string;
  externalId: string;
  email: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  idleMs: number;
  /** Whether a second factor was checked when this session started. */
  mfa: boolean;
  ip?: string;
  userAgent?: string;
  revokedAt?: string;
  revokedReason?: string;
};

export type AuthEventType =
  | "signup"
  | "login.succeeded"
  | "login.failed"
  | "login.locked"
  | "login.blocked_ip"
  | "mfa.challenged"
  | "mfa.failed"
  | "mfa.enabled"
  | "mfa.disabled"
  | "mfa.recovery_used"
  | "session.revoked"
  | "session.revoked_all"
  | "session.expired"
  | "logout"
  | "password.changed"
  | "password.reset_requested"
  | "password.reset"
  | "policy.changed"
  | "access.denied_domain";

export type AuthEvent = { id: string; at: string; type: AuthEventType; externalId?: string; email?: string; workspaceId?: string; ip?: string; userAgent?: string; detail?: Record<string, unknown> };

export type SecurityPolicy = {
  /** Members must use two-step sign-in. Members without it are sent to set it up. */
  requireMfa: boolean;
  /** A session ends after this long without use. */
  idleTimeoutMinutes: number;
  /** When set, only people with these email domains can join or stay signed in to the workspace. */
  allowedDomains: string[];
  updatedAt?: string;
  updatedBy?: string;
};

export const DEFAULT_POLICY: SecurityPolicy = { requireMfa: false, idleTimeoutMinutes: DEFAULT_IDLE_MS / 60000, allowedDomains: [] };
export const IDLE_LIMITS = { min: 15, max: 7 * 24 * 60 };

type Lock = { email: string; failures: string[]; lockedUntil?: string; locks: number };

const sha = (v: string) => crypto.createHash("sha256").update(v).digest("hex").slice(0, 32);
const randomId = (prefix: string) => `${prefix}_${crypto.randomBytes(18).toString("base64url")}`;

/** The client IP and user agent, from the proxy headers Vercel sets. */
export function requestMeta(headers: Headers): RequestMeta {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return { ip: forwarded || headers.get("x-real-ip") || undefined, userAgent: headers.get("user-agent")?.slice(0, 300) || undefined };
}

export function emailDomain(email: string): string {
  return email.split("@")[1]?.toLowerCase() ?? "";
}

export function domainAllowed(email: string, allowed: string[]): boolean {
  if (allowed.length === 0) return true;
  const domain = emailDomain(email);
  return allowed.some((d) => domain === d || domain.endsWith(`.${d}`));
}

export function sanitizePolicy(input: Partial<SecurityPolicy>, current: SecurityPolicy = DEFAULT_POLICY): SecurityPolicy {
  const idle = Number(input.idleTimeoutMinutes ?? current.idleTimeoutMinutes);
  const domains = Array.isArray(input.allowedDomains) ? input.allowedDomains : current.allowedDomains;
  const clean = [...new Set(domains.map((d) => String(d).trim().toLowerCase().replace(/^@/, "")).filter(Boolean))];
  for (const d of clean) if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) throw new Error(`"${d}" is not an email domain. Use a form like acme.com.`);
  if (!Number.isFinite(idle) || idle < IDLE_LIMITS.min || idle > IDLE_LIMITS.max) throw new Error(`Session length must be between ${IDLE_LIMITS.min} minutes and 7 days.`);
  return { requireMfa: input.requireMfa === undefined ? current.requireMfa : input.requireMfa === true, idleTimeoutMinutes: Math.round(idle), allowedDomains: clean.slice(0, 50) };
}

export function createSecurityService(repos: RepositorySet, clock: () => Date = () => new Date()) {
  const now = () => clock();

  async function record(event: Omit<AuthEvent, "id" | "at">) {
    const at = now().toISOString();
    const id = `aev_${at.replace(/[^0-9]/g, "")}_${crypto.randomBytes(4).toString("hex")}`;
    // Indexed by the account when known, otherwise by a hash of the email, so failed guesses at unknown emails are still kept.
    const refId = event.externalId ?? (event.email ? `email:${sha(event.email)}` : "anonymous");
    await repos.documents.put<AuthEvent>({ kind: AUTH_EVENT_KIND, id, workspaceId: event.workspaceId ?? GLOBAL, refId, data: { id, at, ...event } }).catch(() => undefined);
  }

  async function putSession(s: AuthSession) {
    await repos.documents.put<AuthSession>({ kind: SESSION_KIND, id: s.id, workspaceId: GLOBAL, refId: s.externalId, data: s });
  }

  return {
    record,

    // --- sessions ---------------------------------------------------------

    async startSession(identity: { externalId: string; email: string }, meta: RequestMeta, options: { mfa: boolean; idleMs?: number }): Promise<AuthSession> {
      const t = now();
      const session: AuthSession = {
        id: randomId("ses"),
        externalId: identity.externalId,
        email: identity.email,
        createdAt: t.toISOString(),
        lastSeenAt: t.toISOString(),
        expiresAt: new Date(t.getTime() + SESSION_ABSOLUTE_MS).toISOString(),
        idleMs: options.idleMs ?? DEFAULT_IDLE_MS,
        mfa: options.mfa,
        ip: meta.ip,
        userAgent: meta.userAgent
      };
      await putSession(session);
      return session;
    },

    /** The session if it is live: not revoked, not past its absolute end, not idle too long. Touches last-seen. */
    async validate(id: string, externalId: string): Promise<AuthSession | null> {
      const doc = await repos.documents.get<AuthSession>(SESSION_KIND, id);
      const s = doc?.data;
      if (!s || s.externalId !== externalId || s.revokedAt) return null;
      const t = now().getTime();
      if (Date.parse(s.expiresAt) <= t || Date.parse(s.lastSeenAt) + s.idleMs <= t) {
        await putSession({ ...s, revokedAt: now().toISOString(), revokedReason: "expired" });
        await record({ type: "session.expired", externalId: s.externalId, email: s.email, detail: { sessionId: s.id } });
        return null;
      }
      if (t - Date.parse(s.lastSeenAt) > TOUCH_EVERY_MS) {
        const touched = { ...s, lastSeenAt: now().toISOString() };
        await putSession(touched);
        return touched;
      }
      return s;
    },

    async listSessions(externalId: string): Promise<AuthSession[]> {
      const t = now().getTime();
      return (await repos.documents.list<AuthSession>(SESSION_KIND, { refId: externalId }))
        .map((d) => d.data)
        .filter((s) => !s.revokedAt && Date.parse(s.expiresAt) > t && Date.parse(s.lastSeenAt) + s.idleMs > t)
        .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
    },

    async revoke(externalId: string, id: string, reason: string, meta: RequestMeta = {}): Promise<boolean> {
      const doc = await repos.documents.get<AuthSession>(SESSION_KIND, id);
      if (!doc || doc.data.externalId !== externalId || doc.data.revokedAt) return false;
      await putSession({ ...doc.data, revokedAt: now().toISOString(), revokedReason: reason });
      await record({ type: reason === "logout" ? "logout" : "session.revoked", externalId, email: doc.data.email, ...meta, detail: { sessionId: id, reason } });
      return true;
    },

    /** Ends every session for an account, except `keep` when given. Returns how many ended. */
    async revokeAll(externalId: string, reason: string, keep?: string, meta: RequestMeta = {}): Promise<number> {
      const live = (await repos.documents.list<AuthSession>(SESSION_KIND, { refId: externalId })).map((d) => d.data).filter((s) => !s.revokedAt && s.id !== keep);
      const at = now().toISOString();
      for (const s of live) await putSession({ ...s, revokedAt: at, revokedReason: reason });
      if (live.length) await record({ type: "session.revoked_all", externalId, ...meta, detail: { reason, count: live.length } });
      return live.length;
    },

    /** After setting up two-step sign-in, the session it was set up in counts as checked. */
    async markMfa(externalId: string, id: string): Promise<void> {
      const doc = await repos.documents.get<AuthSession>(SESSION_KIND, id);
      if (doc && doc.data.externalId === externalId && !doc.data.revokedAt) await putSession({ ...doc.data, mfa: true });
    },

    // --- lockout ----------------------------------------------------------

    /** Whether the account is locked, and until when. */
    async lockState(email: string): Promise<{ locked: boolean; until?: string }> {
      const lock = (await repos.documents.get<Lock>(LOCK_KIND, sha(email)))?.data;
      if (lock?.lockedUntil && Date.parse(lock.lockedUntil) > now().getTime()) return { locked: true, until: lock.lockedUntil };
      return { locked: false };
    },

    /**
     * Count a failed attempt. After `LOCKOUT.failures` inside the window the
     * account locks; each lock lasts twice as long as the last, up to a day.
     */
    async recordFailure(email: string, meta: RequestMeta, externalId?: string): Promise<{ lockedUntil?: string }> {
      const key = sha(email);
      const t = now().getTime();
      const current = (await repos.documents.get<Lock>(LOCK_KIND, key))?.data ?? { email, failures: [], locks: 0 };
      const failures = [...current.failures.filter((f) => t - Date.parse(f) < LOCKOUT.windowMs), now().toISOString()];
      let next: Lock = { ...current, failures };
      if (failures.length >= LOCKOUT.failures) {
        const ms = Math.min(LOCKOUT.baseLockMs * 2 ** current.locks, LOCKOUT.maxLockMs);
        next = { email, failures: [], locks: current.locks + 1, lockedUntil: new Date(t + ms).toISOString() };
      }
      await repos.documents.put<Lock>({ kind: LOCK_KIND, id: key, workspaceId: GLOBAL, data: next });
      await record({ type: next.lockedUntil && next.lockedUntil !== current.lockedUntil ? "login.locked" : "login.failed", email, externalId, ...meta, detail: next.lockedUntil ? { lockedUntil: next.lockedUntil } : { failures: failures.length } });
      return { lockedUntil: next.lockedUntil };
    },

    /** A successful sign-in clears the failure count (not the escalation, which decays only with time). */
    async recordSuccess(email: string): Promise<void> {
      const key = sha(email);
      const current = (await repos.documents.get<Lock>(LOCK_KIND, key))?.data;
      if (current && current.failures.length) await repos.documents.put<Lock>({ kind: LOCK_KIND, id: key, workspaceId: GLOBAL, data: { ...current, failures: [], lockedUntil: undefined } });
    },

    /** Per-IP limit across all accounts, so one address cannot spray many emails. */
    async ipAllowed(meta: RequestMeta): Promise<boolean> {
      if (!meta.ip) return true;
      const result = await repos.rateLimits.consume({ bucket: `auth-ip:${meta.ip}`, windowSeconds: IP_LIMIT.windowSeconds, limit: IP_LIMIT.attempts, now: now().toISOString() });
      if (!result.allowed) await record({ type: "login.blocked_ip", ...meta });
      return result.allowed;
    },

    // --- journal ----------------------------------------------------------

    async eventsFor(externalId: string, limit = 50): Promise<AuthEvent[]> {
      return (await repos.documents.list<AuthEvent>(AUTH_EVENT_KIND, { refId: externalId })).map((d) => d.data).sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
    },

    // --- workspace policy -------------------------------------------------

    async policy(workspaceId: string): Promise<SecurityPolicy> {
      const doc = await repos.documents.get<SecurityPolicy>(POLICY_KIND, workspaceId);
      return doc ? { ...DEFAULT_POLICY, ...doc.data } : DEFAULT_POLICY;
    },

    async savePolicy(workspaceId: string, input: Partial<SecurityPolicy>, by: { userId: string; externalId: string; email: string }): Promise<SecurityPolicy> {
      const current = await this.policy(workspaceId);
      const next = { ...sanitizePolicy(input, current), updatedAt: now().toISOString(), updatedBy: by.userId };
      if (!domainAllowed(by.email, next.allowedDomains)) throw new Error(`Your own email (${emailDomain(by.email)}) is not in that list, so saving it would lock you out. Add your domain too.`);
      await repos.documents.put<SecurityPolicy>({ kind: POLICY_KIND, id: workspaceId, workspaceId, data: next });
      await record({ type: "policy.changed", externalId: by.externalId, email: by.email, workspaceId, detail: { from: { requireMfa: current.requireMfa, idleTimeoutMinutes: current.idleTimeoutMinutes, allowedDomains: current.allowedDomains }, to: { requireMfa: next.requireMfa, idleTimeoutMinutes: next.idleTimeoutMinutes, allowedDomains: next.allowedDomains } } });
      await repos.audits.add({ actorType: "user", actorId: by.userId, workspaceId, action: "security.policy_changed", targetType: "workspace", targetId: workspaceId, outcome: "success", metadata: JSON.stringify({ requireMfa: next.requireMfa, idleTimeoutMinutes: next.idleTimeoutMinutes, allowedDomains: next.allowedDomains }) });
      return next;
    }
  };
}

export type SecurityService = ReturnType<typeof createSecurityService>;
