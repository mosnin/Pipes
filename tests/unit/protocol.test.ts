import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { createBoundedServices } from "@/domain/services/bounded";
import { getProtocolContext, requireCapability } from "@/lib/protocol/auth";
import { hashAgentToken } from "@/lib/protocol/tokens";
import { POST as mcpPost } from "@/app/api/protocol/mcp/route";
import { POST as createSystemPost } from "@/app/api/protocol/systems/route";
import { mapProtocolError, ProtocolError } from "@/lib/protocol/errors";

const DB_FILE = path.join(process.cwd(), ".pipes-db.json");

describe("protocol token and hardening flow", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  });

  it("creates, verifies, and revokes token with safe storage", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|usr_1", email: "owner@pipes.local", name: "Alex Rivera" });

    const created = await services.protocol.createToken(ctx, { name: "Automation", capabilities: ["systems:read"] });
    expect(created.secret.startsWith("ptk_")).toBe(true);

    const stored = await repos.agentTokens.findByHash(hashAgentToken(created.secret));
    expect(stored?.id).toBeTruthy();

    const listed = await services.protocol.listTokens(ctx);
    expect(listed[0].tokenPreview).not.toBe(created.secret);

    await services.protocol.revokeToken(ctx, listed[0].id);
    const revoked = await repos.agentTokens.findByHash(hashAgentToken(created.secret));
    expect(revoked?.revokedAt).toBeTruthy();
  });

  it("enforces capability and system scope for agent context", () => {
    const ctx = {
      userId: "usr_1",
      workspaceId: "wks_1",
      role: "Editor" as const,
      plan: "Pro" as const,
      actorType: "agent" as const,
      actorId: "agt_1",
      capabilities: ["systems:read"],
      systemScope: "sys_1"
    };

    expect(() => requireCapability(ctx, "systems:read", "sys_1")).not.toThrow();
    expect(() => requireCapability(ctx, "graph:write", "sys_1")).toThrow();
    expect(() => requireCapability(ctx, "systems:read", "sys_other")).toThrow();
  });

  it("maps errors to stable protocol codes", () => {
    expect(mapProtocolError(new Error("Invalid protocol token.")).code).toBe("AUTH_INVALID");
    expect(mapProtocolError(new Error("Insufficient permissions.")).code).toBe("PERMISSION_DENIED");
    expect(mapProtocolError(new ProtocolError("RATE_LIMITED", "Rate limit exceeded.", 429)).code).toBe("RATE_LIMITED");
  });

  it("supports idempotent system creation", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const userCtx = await repos.users.provision({ externalId: "mock|usr_1", email: "owner@pipes.local", name: "Alex Rivera" });
    const token = await services.protocol.createToken(userCtx, { name: "Writer", capabilities: ["systems:write", "systems:read"] });

    const body = JSON.stringify({ name: "Idempotent System", description: "repeat safe" });
    const req1 = new Request("http://localhost/api/protocol/systems", { method: "POST", headers: { authorization: `Bearer ${token.secret}`, "content-type": "application/json", "idempotency-key": "idem-system-1" }, body });
    const req2 = new Request("http://localhost/api/protocol/systems", { method: "POST", headers: { authorization: `Bearer ${token.secret}`, "content-type": "application/json", "idempotency-key": "idem-system-1" }, body });

    const r1 = await createSystemPost(req1);
    const r2 = await createSystemPost(req2);
    const b1 = await r1.json();
    const b2 = await r2.json();

    expect(b1.data.systemId).toBe(b2.data.systemId);
    expect(b2.replayed).toBe(true);
  });

  it("enforces rate limit guard", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const userCtx = await repos.users.provision({ externalId: "mock|usr_1", email: "owner@pipes.local", name: "Alex Rivera" });
    const decision1 = await services.guards.consumeRateLimit(userCtx, "rest", "test", 1, 60);
    expect(decision1.allowed).toBe(true);
    await expect(services.guards.consumeRateLimit(userCtx, "rest", "test", 1, 60)).rejects.toThrow("Rate limit exceeded");
  });

  it("allows MCP tool delegation with token auth", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const userCtx = await repos.users.provision({ externalId: "mock|usr_1", email: "owner@pipes.local", name: "Alex Rivera" });
    const token = await services.protocol.createToken(userCtx, { name: "MCP Reader", capabilities: ["systems:read"] });

    const request = new Request("http://localhost/api/protocol/mcp", {
      method: "POST",
      headers: { authorization: `Bearer ${token.secret}`, "content-type": "application/json" },
      body: JSON.stringify({ tool: "list_systems", input: {} })
    });

    const response = await mcpPost(request);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);

    const protocolCtx = await getProtocolContext(new Request("http://localhost", { headers: { authorization: `Bearer ${token.secret}` } }));
    expect(protocolCtx.ctx.actorType).toBe("agent");
  });
});
