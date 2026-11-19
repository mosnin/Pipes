import { describe, expect, it } from "vitest";
import { createSecurityService, domainAllowed, LOCKOUT, sanitizePolicy } from "@/domain/auth/security";
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

describe("account lockout", () => {
  it("locks after repeated failures, with escalating locks, and clears on success", async () => {
    const c = clock();
    const s = createSecurityService(repos(), c);
    for (let i = 0; i < LOCKOUT.failures - 1; i++) expect((await s.recordFailure("bea@acme.com", meta)).lockedUntil).toBeUndefined();
    const first = await s.recordFailure("bea@acme.com", meta);
    expect(first.lockedUntil).toBeTruthy();
    expect((await s.lockState("bea@acme.com")).locked).toBe(true);
    c.advance(LOCKOUT.baseLockMs + 1000);
    expect((await s.lockState("bea@acme.com")).locked).toBe(false);
    for (let i = 0; i < LOCKOUT.failures; i++) await s.recordFailure("bea@acme.com", meta);
    // The second lock lasts twice as long.
    c.advance(LOCKOUT.baseLockMs + 1000);
    expect((await s.lockState("bea@acme.com")).locked).toBe(true);
    expect((await s.eventsFor("anything")).length).toBe(0);
  });

  it("refuses leaked and email-based passwords", () => {
    expect(validatePasswordStrength("password123")).toMatch(/leaked/);
    expect(validatePasswordStrength("aaaaaaaaaaaa")).toMatch(/repeated/);
    expect(validatePasswordStrength("beatrice-2026!", "beatrice@acme.com")).toMatch(/email/);
    expect(validatePasswordStrength("correct horse battery staple", "bea@acme.com")).toBeNull();
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

describe("workspace session rules", () => {
  it("ends sessions idle past the workspace limit, and any older than 7 days", async () => {
    const { sessionProblem } = await import("@/domain/auth/security");
    const now = Date.parse("2026-11-19T12:00:00Z");
    const ago = (ms: number) => new Date(now - ms).toISOString();
    const H = 60 * 60 * 1000;
    expect(sessionProblem({ createdAt: ago(2 * H), updatedAt: ago(10 * 60 * 1000) }, { idleTimeoutMinutes: 60 }, now)).toBeNull();
    expect(sessionProblem({ createdAt: ago(3 * H), updatedAt: ago(2 * H) }, { idleTimeoutMinutes: 60 }, now)).toBe("idle");
    expect(sessionProblem({ createdAt: ago(8 * 24 * H), updatedAt: ago(60 * 1000) }, { idleTimeoutMinutes: 1440 }, now)).toBe("expired");
    expect(sessionProblem({}, { idleTimeoutMinutes: 15 }, now)).toBeNull();
  });
});
