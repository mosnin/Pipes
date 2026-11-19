import { describe, expect, it } from "vitest";
import { createSecurityService, DEFAULT_IDLE_MS, domainAllowed, LOCKOUT, sanitizePolicy } from "@/domain/auth/security";
import { createAccountService } from "@/domain/services/accounts";
import { base32Encode, codeAt, stepAt, verifyCode } from "@/lib/auth/totp";
import { validatePasswordStrength } from "@/lib/auth/password";
import type { RepositorySet, StoredDocument } from "@/lib/repositories/contracts";

function repos(): RepositorySet {
  const docs = new Map<string, StoredDocument<any>>();
  const buckets = new Map<string, string[]>();
  const k = (kind: string, id: string) => `${kind}/${id}`;
  return {
    documents: {
      async get(kind: string, id: string) {
        return docs.get(k(kind, id)) ?? null;
      },
      async put(input: any) {
        docs.set(k(input.kind, input.id), { ...input, createdAt: "", updatedAt: "" });
        return docs.get(k(input.kind, input.id));
      },
      async list(kind: string, f: { workspaceId?: string; refId?: string }) {
        return [...docs.values()].filter((d) => d.kind === kind && (!f.workspaceId || d.workspaceId === f.workspaceId) && (!f.refId || d.refId === f.refId));
      },
      async remove() {},
      async commit() {
        return { ok: true };
      }
    },
    rateLimits: {
      async consume(input: { bucket: string; windowSeconds: number; limit: number; now: string }) {
        const t = Date.parse(input.now);
        const hits = (buckets.get(input.bucket) ?? []).filter((h) => t - Date.parse(h) < input.windowSeconds * 1000);
        hits.push(input.now);
        buckets.set(input.bucket, hits);
        return { allowed: hits.length <= input.limit, retryAfterSeconds: 60 };
      }
    },
    users: { async provision(identity: { externalId: string }) { return { userId: identity.externalId, workspaceId: "wks", role: "Owner", plan: "Free", actorType: "user", actorId: identity.externalId }; } },
    audits: { async add() {} }
  } as unknown as RepositorySet;
}

function clock(start = "2026-11-19T10:00:00Z") {
  let t = Date.parse(start);
  const fn = () => new Date(t);
  return Object.assign(fn, { advance: (ms: number) => (t += ms) });
}

const meta = { ip: "203.0.113.7", userAgent: "test" };

describe("TOTP", () => {
  it("matches the RFC 6238 test vector", () => {
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    // RFC 6238, T = 59 seconds, SHA1: 94287082 (8 digits), so 287082 for six.
    expect(codeAt(secret, stepAt(59_000))).toBe("287082");
    expect(codeAt(secret, stepAt(1111111109_000))).toBe("081804");
  });

  it("accepts one step of drift and refuses a replayed code", () => {
    const secret = base32Encode(Buffer.from("12345678901234567890"));
    const now = 1_700_000_000_000;
    const prev = codeAt(secret, stepAt(now) - 1);
    const step = verifyCode(secret, prev, now);
    expect(step).toBe(stepAt(now) - 1);
    expect(verifyCode(secret, prev, now, step!)).toBeNull();
    expect(verifyCode(secret, codeAt(secret, stepAt(now) - 3), now)).toBeNull();
    expect(verifyCode(secret, "12345", now)).toBeNull();
  });
});

describe("sessions", () => {
  it("start, validate, expire when idle, and revoke", async () => {
    const c = clock();
    const s = createSecurityService(repos(), c);
    const session = await s.startSession({ externalId: "u1", email: "a@acme.com" }, meta, { mfa: false, idleMs: 60 * 60 * 1000 });
    expect(await s.validate(session.id, "u1")).not.toBeNull();
    expect(await s.validate(session.id, "someone-else")).toBeNull();
    c.advance(61 * 60 * 1000);
    expect(await s.validate(session.id, "u1")).toBeNull();
    expect((await s.eventsFor("u1")).map((e) => e.type)).toContain("session.expired");
  });

  it("ends every other session on revokeAll, keeping the current one", async () => {
    const s = createSecurityService(repos(), clock());
    const a = await s.startSession({ externalId: "u1", email: "a@acme.com" }, meta, { mfa: false });
    const b = await s.startSession({ externalId: "u1", email: "a@acme.com" }, meta, { mfa: false });
    const other = await s.startSession({ externalId: "u2", email: "b@acme.com" }, meta, { mfa: false });
    expect(await s.revokeAll("u1", "password_changed", a.id)).toBe(1);
    expect(await s.validate(a.id, "u1")).not.toBeNull();
    expect(await s.validate(b.id, "u1")).toBeNull();
    expect(await s.validate(other.id, "u2")).not.toBeNull();
    expect((await s.listSessions("u1")).map((x) => x.id)).toEqual([a.id]);
  });

  it("uses a day of idle time by default and never outlives seven days", async () => {
    const c = clock();
    const s = createSecurityService(repos(), c);
    const session = await s.startSession({ externalId: "u1", email: "a@acme.com" }, meta, { mfa: false });
    expect(session.idleMs).toBe(DEFAULT_IDLE_MS);
    for (let i = 0; i < 9; i++) {
      c.advance(20 * 60 * 60 * 1000);
      await s.validate(session.id, "u1");
    }
    expect(await s.validate(session.id, "u1")).toBeNull();
  });
});

describe("sign-in hardening", () => {
  it("locks an account after repeated failures, with escalating locks", async () => {
    const c = clock();
    const r = repos();
    const accounts = createAccountService(r, c);
    await accounts.signup({ name: "Bea", email: "bea@acme.com", password: "a long and unusual passphrase" });
    for (let i = 0; i < LOCKOUT.failures - 1; i++) expect((await accounts.login({ email: "bea@acme.com", password: "wrong password!" })).ok).toBe(false);
    const fifth = await accounts.login({ email: "bea@acme.com", password: "wrong password!" });
    expect(fifth).toMatchObject({ ok: false, error: "locked" });
    // Even the right password is refused while locked.
    expect(await accounts.login({ email: "bea@acme.com", password: "a long and unusual passphrase" })).toMatchObject({ ok: false, error: "locked" });
    c.advance(LOCKOUT.baseLockMs + 1000);
    expect(await accounts.login({ email: "bea@acme.com", password: "a long and unusual passphrase" })).toMatchObject({ ok: true });
    const events = await createSecurityService(r, c).eventsFor((await accounts.login({ email: "bea@acme.com", password: "a long and unusual passphrase" }) as any).identity.externalId);
    expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(["login.locked", "login.succeeded", "signup"]));
  });

  it("answers an unknown email exactly like a wrong password", async () => {
    const accounts = createAccountService(repos(), clock());
    await accounts.signup({ name: "Bea", email: "bea@acme.com", password: "a long and unusual passphrase" });
    const unknown = await accounts.login({ email: "nobody@acme.com", password: "whatever it is" });
    const wrong = await accounts.login({ email: "bea@acme.com", password: "whatever it is" });
    expect(unknown).toEqual(wrong);
  });

  it("limits attempts per network across many emails", async () => {
    const accounts = createAccountService(repos(), clock());
    let last: any;
    for (let i = 0; i < 31; i++) last = await accounts.login({ email: `user${i}@acme.com`, password: "nope nope nope" }, meta);
    expect(last).toMatchObject({ ok: false, error: "rate_limited" });
  });

  it("refuses leaked and email-based passwords", () => {
    expect(validatePasswordStrength("password123")).toMatch(/leaked/);
    expect(validatePasswordStrength("aaaaaaaaaaaa")).toMatch(/repeated/);
    expect(validatePasswordStrength("beatrice-2026!", "beatrice@acme.com")).toMatch(/email/);
    expect(validatePasswordStrength("correct horse battery staple", "bea@acme.com")).toBeNull();
  });
});

describe("two-step sign-in", () => {
  it("sets up, requires a code at sign-in, accepts a recovery code once, and turns off with password and code", async () => {
    const c = clock();
    const accounts = createAccountService(repos(), c);
    const email = "bea@acme.com";
    const password = "a long and unusual passphrase";
    await accounts.signup({ name: "Bea", email, password });
    const begun = await accounts.beginMfa(email);
    if (!begun.ok) throw new Error(begun.message);
    expect(begun.url).toMatch(/^otpauth:\/\/totp\/Pipes/);
    expect((await accounts.confirmMfa(email, "000000")).ok).toBe(false);
    const confirmed = await accounts.confirmMfa(email, codeAt(begun.secret, stepAt(c().getTime())));
    if (!confirmed.ok) throw new Error(confirmed.message);
    expect(confirmed.recoveryCodes).toHaveLength(10);

    expect(await accounts.login({ email, password })).toMatchObject({ ok: true, mfaRequired: true });
    // The code used to confirm cannot be used again.
    expect((await accounts.verifyMfa(email, codeAt(begun.secret, stepAt(c().getTime())))).ok).toBe(false);
    c.advance(30_000);
    expect((await accounts.verifyMfa(email, codeAt(begun.secret, stepAt(c().getTime())))).ok).toBe(true);

    const recovery = confirmed.recoveryCodes[0];
    expect((await accounts.verifyMfa(email, recovery.toUpperCase())).ok).toBe(true);
    expect((await accounts.verifyMfa(email, recovery)).ok).toBe(false);
    expect(await accounts.recoveryCodesLeft(email)).toBe(9);

    c.advance(30_000);
    expect((await accounts.disableMfa(email, "wrong password!!", codeAt(begun.secret, stepAt(c().getTime())))).ok).toBe(false);
    expect((await accounts.disableMfa(email, password, codeAt(begun.secret, stepAt(c().getTime())))).ok).toBe(true);
    expect(await accounts.login({ email, password })).toMatchObject({ ok: true });
    expect(((await accounts.login({ email, password })) as any).mfaRequired).toBeUndefined();
  });

  it("asks a reset to go through the second step too", async () => {
    const c = clock();
    const accounts = createAccountService(repos(), c);
    await accounts.signup({ name: "Bea", email: "bea@acme.com", password: "a long and unusual passphrase" });
    const begun = await accounts.beginMfa("bea@acme.com");
    if (!begun.ok) throw new Error();
    await accounts.confirmMfa("bea@acme.com", codeAt(begun.secret, stepAt(c().getTime())));
    const { token } = await accounts.requestReset("bea@acme.com");
    expect(await accounts.resetPassword(token!, "another long passphrase")).toMatchObject({ ok: true, mfaRequired: true });
  });
});

describe("workspace policy", () => {
  it("checks domains, including subdomains", () => {
    expect(domainAllowed("a@acme.com", [])).toBe(true);
    expect(domainAllowed("a@eu.acme.com", ["acme.com"])).toBe(true);
    expect(domainAllowed("a@notacme.com", ["acme.com"])).toBe(false);
  });

  it("validates policy input and refuses to lock out the person saving it", async () => {
    expect(() => sanitizePolicy({ idleTimeoutMinutes: 5 })).toThrow(/between/);
    expect(() => sanitizePolicy({ allowedDomains: ["not a domain"] })).toThrow(/not an email domain/);
    expect(sanitizePolicy({ allowedDomains: ["@Acme.com", "acme.com"] }).allowedDomains).toEqual(["acme.com"]);
    const s = createSecurityService(repos(), clock());
    await expect(s.savePolicy("wks", { allowedDomains: ["other.com"] }, { userId: "u1", externalId: "x1", email: "me@acme.com" })).rejects.toThrow(/lock you out/);
    const saved = await s.savePolicy("wks", { requireMfa: true, allowedDomains: ["acme.com"] }, { userId: "u1", externalId: "x1", email: "me@acme.com" });
    expect(saved).toMatchObject({ requireMfa: true, allowedDomains: ["acme.com"] });
    expect((await s.policy("wks")).requireMfa).toBe(true);
    expect((await s.eventsFor("x1")).map((e) => e.type)).toContain("policy.changed");
  });
});
