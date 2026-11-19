// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { beforeEach, describe, expect, it } from "vitest";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { base32 } from "@better-auth/utils/base32";
import { createOTP } from "@better-auth/utils/otp";
import { buildAuthOptions } from "@/lib/auth/options";
import { hashPassword as legacyHash } from "@/lib/auth/password";
import { AUTH_EVENT_KIND } from "@/domain/auth/security";
import type { RepositorySet, StoredDocument } from "@/lib/repositories/contracts";

const BASE = "http://localhost:3000";

function repos() {
  const docs = new Map<string, StoredDocument<any>>();
  const buckets = new Map<string, number[]>();
  const provisioned: string[] = [];
  const k = (kind: string, id: string) => `${kind}/${id}`;
  const r = {
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
      async remove(kind: string, id: string) {
        docs.delete(k(kind, id));
      },
      async commit() {
        return { ok: true };
      }
    },
    rateLimits: {
      async consume(input: { bucket: string; windowSeconds: number; limit: number; now: string }) {
        const t = Date.parse(input.now);
        const hits = (buckets.get(input.bucket) ?? []).filter((h) => t - h < input.windowSeconds * 1000);
        hits.push(t);
        buckets.set(input.bucket, hits);
        return { allowed: hits.length <= input.limit, retryAfterSeconds: 60 };
      }
    },
    users: {
      async provision(identity: { externalId: string }) {
        provisioned.push(identity.externalId);
        return { userId: identity.externalId, workspaceId: "wks", role: "Owner", plan: "Free", actorType: "user", actorId: identity.externalId };
      }
    },
    audits: { async add() {} }
  } as unknown as RepositorySet;
  return { r, docs, provisioned };
}

async function makeAuth() {
  const { r, docs, provisioned } = repos();
  const options = buildAuthOptions({ database: new DatabaseSync(":memory:"), repos: r, baseURL: BASE, secret: "test-secret-test-secret-test-secret-123", production: false });
  await (await getMigrations(options)).runMigrations();
  const auth = betterAuth(options);
  return { auth, docs, provisioned, events: () => [...docs.values()].filter((d) => d.kind === AUTH_EVENT_KIND).map((d) => d.data.type as string) };
}

type Auth = Awaited<ReturnType<typeof makeAuth>>["auth"];

/** A browser: keeps cookies between calls, sends a same-origin Origin header. */
function browser(auth: Auth, ip = "203.0.113.9") {
  const jar = new Map<string, string>();
  const call = async (path: string, body?: unknown, method = "POST", origin = BASE) => {
    const res = await auth.handler(
      new Request(`${BASE}/api/auth${path}`, {
        method,
        headers: { "content-type": "application/json", origin, "x-forwarded-for": ip, cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; ") },
        body: method === "GET" ? undefined : JSON.stringify(body ?? {})
      })
    );
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const [name, ...rest] = pair.split("=");
      const value = rest.join("=");
      if (value === "" || /max-age=0/i.test(c)) jar.delete(name);
      else jar.set(name, value);
    }
    const text = await res.text();
    return { status: res.status, json: text ? JSON.parse(text) : null };
  };
  return { call, jar };
}

const codeFor = async (totpURI: string, offsetSteps = 0) => {
  const secret = new URL(totpURI).searchParams.get("secret")!;
  const otp = createOTP(base32.decode(secret), { period: 30, digits: 6 });
  return otp.hotp(Math.floor(Date.now() / 30_000) + offsetSteps);
};

const email = "bea@acme.test";
const password = "a long and unusual passphrase";

describe("Better Auth sign-in for Pipes", () => {
  let t: Awaited<ReturnType<typeof makeAuth>>;
  beforeEach(async () => {
    t = await makeAuth();
  });

  it("signs up, provisions the Pipes user, and journals it", async () => {
    const b = browser(t.auth);
    const res = await b.call("/sign-up/email", { name: "Bea", email, password });
    expect(res.status).toBe(200);
    expect(res.json.user.externalId).toMatch(/^ba\|/);
    expect(t.provisioned).toEqual([res.json.user.externalId]);
    expect(t.events()).toContain("signup");
    expect([...b.jar.keys()].some((n) => n.endsWith("pipes.session_token"))).toBe(true);
  });

  it("refuses leaked passwords and passwords built from the email", async () => {
    const b = browser(t.auth);
    expect((await b.call("/sign-up/email", { name: "X", email: "x@acme.test", password: "password123" })).json.code).toBe("WEAK_PASSWORD");
    expect((await b.call("/sign-up/email", { name: "B", email: "beatrice@acme.test", password: "beatrice-and-more" })).status).toBe(400);
  });

  it("keeps accounts from Pipes' earlier sign-in working with their old password hash", async () => {
    const ctx = await t.auth.$context;
    const user = await ctx.internalAdapter.createUser({ email: "old@acme.test", name: "Old", emailVerified: false, externalId: "pw|legacy-1" } as never, { method: "email" } as never);
    await ctx.internalAdapter.linkAccount({ userId: user.id, providerId: "credential", accountId: user.id, password: legacyHash("my old long passphrase") });
    const b = browser(t.auth);
    expect((await b.call("/sign-in/email", { email: "old@acme.test", password: "wrong passphrase!" })).status).toBe(401);
    const ok = await b.call("/sign-in/email", { email: "old@acme.test", password: "my old long passphrase" });
    expect(ok.status).toBe(200);
    expect(ok.json.user.externalId).toBe("pw|legacy-1");
  });

  it("locks an account after five wrong passwords, even for the right one, from any address", async () => {
    await browser(t.auth).call("/sign-up/email", { name: "Bea", email, password });
    for (let i = 0; i < 5; i++) await browser(t.auth, `198.51.100.${i}`).call("/sign-in/email", { email, password: "wrong password here" });
    const locked = await browser(t.auth, "198.51.100.99").call("/sign-in/email", { email, password });
    expect(locked.status).toBe(423);
    expect(locked.json.code).toBe("ACCOUNT_LOCKED");
    expect(t.events()).toEqual(expect.arrayContaining(["login.failed", "login.locked"]));
  });

  it("refuses a request from another site", async () => {
    const b = browser(t.auth);
    await b.call("/sign-up/email", { name: "Bea", email, password });
    expect((await b.call("/sign-out", {}, "POST", "https://evil.example")).status).toBe(403);
  });

  it("runs two-step sign-in end to end: enable, challenge, code, replay refused, mfa on the session", async () => {
    const b = browser(t.auth);
    await b.call("/sign-up/email", { name: "Bea", email, password });
    const enabled = await b.call("/two-factor/enable", { password });
    expect(enabled.status).toBe(200);
    expect(enabled.json.backupCodes).toHaveLength(10);
    expect(enabled.json.backupCodes[0]).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}$/);
    const first = await b.call("/two-factor/verify-totp", { code: await codeFor(enabled.json.totpURI) });
    expect(first.status, JSON.stringify(first.json)).toBe(200);
    await b.call("/sign-out", {});

    const phone = browser(t.auth, "203.0.113.20");
    const challenged = await phone.call("/sign-in/email", { email, password });
    expect(challenged.json.twoFactorRedirect).toBe(true);
    expect([...phone.jar.keys()].some((n) => n.endsWith("pipes.session_token"))).toBe(false);
    const code = await codeFor(enabled.json.totpURI, 1);
    const verified = await phone.call("/two-factor/verify-totp", { code });
    expect(verified.status, JSON.stringify(verified.json)).toBe(200);
    const session = await phone.call("/get-session", undefined, "GET");
    expect(session.json.session.mfa, JSON.stringify(session.json.session)).toBe(true);

    // The same code again, in a fresh challenge, is refused.
    const thief = browser(t.auth, "203.0.113.66");
    await thief.call("/sign-in/email", { email, password });
    const replay = await thief.call("/two-factor/verify-totp", { code });
    expect(replay.status).toBe(401);
    expect(replay.json.code).toBe("CODE_REUSED");
    expect(t.events()).toEqual(expect.arrayContaining(["mfa.enabled", "mfa.challenged", "login.succeeded", "mfa.failed"]));
  });

  it("stores recovery codes only as hashes and accepts each once", async () => {
    const b = browser(t.auth);
    await b.call("/sign-up/email", { name: "Bea", email, password });
    const enabled = await b.call("/two-factor/enable", { password });
    await b.call("/two-factor/verify-totp", { code: await codeFor(enabled.json.totpURI) });
    const ctx = await t.auth.$context;
    const row = await ctx.adapter.findOne<{ backupCodes: string }>({ model: "twoFactor", where: [{ field: "userId", value: (await b.call("/get-session", undefined, "GET")).json.user.id }] });
    expect(row!.backupCodes).not.toContain(enabled.json.backupCodes[0]);
    await b.call("/sign-out", {});
    const other = browser(t.auth, "203.0.113.30");
    await other.call("/sign-in/email", { email, password });
    expect((await other.call("/two-factor/verify-backup-code", { code: enabled.json.backupCodes[0].toUpperCase() })).status).toBe(200);
    const again = browser(t.auth, "203.0.113.31");
    await again.call("/sign-in/email", { email, password });
    expect((await again.call("/two-factor/verify-backup-code", { code: enabled.json.backupCodes[0] })).status).toBe(401);
  });

  it("needs a current code as well as the password to turn two-step off", async () => {
    const b = browser(t.auth);
    await b.call("/sign-up/email", { name: "Bea", email, password });
    const enabled = await b.call("/two-factor/enable", { password });
    await b.call("/two-factor/verify-totp", { code: await codeFor(enabled.json.totpURI) });
    const without = await b.call("/two-factor/disable", { password });
    expect(without.status).toBe(400);
    expect(without.json.code).toBe("CODE_REQUIRED");
    expect((await b.call("/two-factor/disable", { password, code: "000000" })).status).toBe(400);
    expect((await b.call("/two-factor/disable", { password, code: await codeFor(enabled.json.totpURI, 1) })).status).toBe(200);
    expect(t.events()).toContain("mfa.disabled");
  });

  it("signs out every other session on a password change, and refuses a weak new password", async () => {
    const a = browser(t.auth);
    await a.call("/sign-up/email", { name: "Bea", email, password });
    const other = browser(t.auth, "203.0.113.40");
    await other.call("/sign-in/email", { email, password });
    expect((await a.call("/change-password", { currentPassword: password, newPassword: "password123" })).status).toBe(400);
    expect((await a.call("/change-password", { currentPassword: password, newPassword: "another long passphrase", revokeOtherSessions: false })).status).toBe(200);
    expect((await other.call("/get-session", undefined, "GET")).json).toBeNull();
    expect((await a.call("/get-session", undefined, "GET")).json?.user.email).toBe(email);
    expect(t.events()).toContain("password.changed");
  });
});
