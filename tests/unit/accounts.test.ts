import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createAccountService } from "@/domain/services/accounts";
import type { RepositorySet, StoredDocument } from "@/lib/repositories/contracts";

function memoryRepos() {
  const docs = new Map<string, StoredDocument>();
  const provisioned: string[] = [];
  const repos = {
    documents: {
      async get(kind: string, id: string) { return (docs.get(`${kind}:${id}`) as any) ?? null; },
      async put(input: any) { const doc = { ...input, createdAt: "t", updatedAt: "t" }; docs.set(`${input.kind}:${input.id}`, doc); return doc; },
      async list() { return []; },
      async remove() {}
    },
    rateLimits: { async consume() { return { allowed: true, remaining: 1, retryAfterSeconds: 0 }; } },
    users: { async provision(identity: { email: string }) { provisioned.push(identity.email); return {} as any; }, async findByEmail() { return null; } }
  } as unknown as RepositorySet;
  return { repos, provisioned };
}

describe("password hashing", () => {
  it("verifies the right password and rejects the wrong one", () => {
    const stored = hashPassword("correct horse battery");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("correct horse battery", stored)).toBe(true);
    expect(verifyPassword("wrong horse battery", stored)).toBe(false);
  });

  it("salts every hash", () => {
    expect(hashPassword("same password here")).not.toBe(hashPassword("same password here"));
  });
});

describe("account service", () => {
  it("signs up, provisions a workspace, and logs in", async () => {
    const { repos, provisioned } = memoryRepos();
    const accounts = createAccountService(repos);
    const created = await accounts.signup({ name: "Ada", email: " Ada@Example.com ", password: "long enough pw" });
    expect(created.ok).toBe(true);
    expect(provisioned).toEqual(["ada@example.com"]);
    const login = await accounts.login({ email: "ada@example.com", password: "long enough pw" });
    expect(login.ok && login.identity.externalId.startsWith("pw|")).toBe(true);
  });

  it("rejects duplicates, weak passwords, bad emails and wrong passwords", async () => {
    const { repos } = memoryRepos();
    const accounts = createAccountService(repos);
    await accounts.signup({ name: "Ada", email: "ada@example.com", password: "long enough pw" });
    expect(await accounts.signup({ name: "Ada", email: "ada@example.com", password: "long enough pw" })).toMatchObject({ ok: false, error: "email_taken" });
    expect(await accounts.signup({ name: "B", email: "b@example.com", password: "short" })).toMatchObject({ ok: false, error: "weak_password" });
    expect(await accounts.signup({ name: "C", email: "not-an-email", password: "long enough pw" })).toMatchObject({ ok: false, error: "invalid_email" });
    expect(await accounts.login({ email: "ada@example.com", password: "wrong password" })).toMatchObject({ ok: false, error: "invalid_credentials" });
  });
});
