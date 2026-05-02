import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { createBoundedServices } from "@/domain/services/bounded";

const DB_FILE = path.join(process.cwd(), ".pipes-db.json");

describe("enterprise auth readiness settings", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  });

  it("validates sso_ready configuration and domains", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|auth", email: "auth@pipes.local", name: "Auth" });

    await expect(services.governance.updateEnterpriseAuth(ctx, { mode: "sso_ready", allowedDomains: ["bad domain"], enforceDomainMatch: true })).rejects.toThrow("Invalid domain");
    await expect(services.governance.updateEnterpriseAuth(ctx, { mode: "sso_ready", allowedDomains: ["example.com"], enforceDomainMatch: true })).rejects.toThrow("An SSO connection is required");

    const updated = await services.governance.updateEnterpriseAuth(ctx, { mode: "sso_ready", allowedDomains: ["example.com"], ssoConnection: "saml-acme", enforceDomainMatch: true });
    expect(updated.auth.mode).toBe("sso_ready");
    expect(updated.auth.allowedDomains).toContain("example.com");
  });
});
