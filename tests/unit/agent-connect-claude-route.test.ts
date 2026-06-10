import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockedServer = vi.fn();
vi.mock("@/lib/composition/server", () => ({ getServerApp: mockedServer }));

vi.mock("@/lib/env", () => ({
  env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
  runtimeFlags: { useMocks: true }
}));

type AgentTokenInsert = {
  workspaceId: string;
  name: string;
  capabilities: string[];
  systemId?: string;
  tokenHash: string;
  tokenPreview: string;
  createdByUserId: string;
};

type AuditInsert = {
  actorType: "user" | "agent";
  actorId: string;
  workspaceId: string;
  action: string;
  targetType: string;
  targetId?: string;
  outcome: "success" | "failure";
  metadata?: string;
  systemId?: string;
};

function buildBaseApp() {
  const tokensCreated: AgentTokenInsert[] = [];
  const auditsCreated: AuditInsert[] = [];
  let counter = 0;

  const ensureCanView = vi.fn();
  const systemsList = vi.fn().mockResolvedValue([
    {
      id: "sys_test",
      workspaceId: "wks_1",
      name: "Test System",
      description: "",
      createdBy: "usr_1",
      createdAt: "",
      updatedAt: ""
    }
  ]);

  const app = {
    identity: { email: "owner@pipes.local", externalId: "mock|usr_1", name: "Alex" },
    ctx: {
      workspaceId: "wks_1",
      userId: "usr_1",
      actorType: "user" as const,
      actorId: "usr_1",
      role: "Owner" as const,
      plan: "Pro" as const
    },
    services: {
      access: {
        ensureCanView,
        ensureCanEdit: vi.fn(),
        ensureCanComment: vi.fn(),
        ensureCanManageMembers: vi.fn(),
        ensureInternalOperator: vi.fn()
      }
    },
    repositories: {
      systems: { list: systemsList },
      agentTokens: {
        create: vi.fn(async (input: AgentTokenInsert) => {
          tokensCreated.push(input);
          return { id: `agt_${++counter}` };
        })
      },
      audits: {
        add: vi.fn(async (input: AuditInsert) => {
          auditsCreated.push(input);
        })
      }
    },
    runtimeMode: "mock" as const,
    runtimeWarning: undefined as string | undefined
  };

  return { app, ensureCanView, tokensCreated, auditsCreated };
}

beforeEach(() => {
  mockedServer.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("/api/agent/connect-claude route", () => {
  it("returns a scoped, read-only token and config block on the happy path", async () => {
    const { app, tokensCreated } = buildBaseApp();
    mockedServer.mockResolvedValue(app);

    const { POST } = await import("@/app/api/agent/connect-claude/route");
    const res = await POST(
      new Request("http://localhost/api/agent/connect-claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId: "sys_test" })
      })
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; data: Record<string, unknown> };
    expect(body.ok).toBe(true);

    const data = body.data as {
      token: string;
      mcpUrl: string;
      configBlock: {
        mcpServers: Record<
          string,
          { url: string; transport: string; headers: { Authorization: string } }
        >;
      };
      claudeDeepLink: string;
      expiresAt: string;
      capabilities: string[];
    };

    expect(typeof data.token).toBe("string");
    expect(data.token.startsWith("ptk_")).toBe(true);
    expect(data.mcpUrl).toBe("http://localhost:3000/api/protocol/mcp");

    const serverEntries = Object.values(data.configBlock.mcpServers);
    expect(serverEntries).toHaveLength(1);
    expect(serverEntries[0].transport).toBe("http");
    expect(serverEntries[0].url).toBe("http://localhost:3000/api/protocol/mcp");
    expect(serverEntries[0].headers.Authorization).toBe(`Bearer ${data.token}`);

    expect(data.claudeDeepLink.startsWith("claude://mcp/install?config=")).toBe(true);
    const encoded = data.claudeDeepLink.split("config=")[1];
    const decoded = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    expect(decoded).toEqual(data.configBlock);

    // Token persisted with read-only capabilities only.
    expect(tokensCreated).toHaveLength(1);
    expect(tokensCreated[0].systemId).toBe("sys_test");
    expect(tokensCreated[0].workspaceId).toBe("wks_1");
    expect(tokensCreated[0].capabilities).toEqual([
      "systems:read",
      "schema:read",
      "graph:read",
      "validation:read"
    ]);
  });

  it("returns 401 when authentication fails", async () => {
    mockedServer.mockRejectedValue(new Error("Authentication required"));
    const { POST } = await import("@/app/api/agent/connect-claude/route");
    const res = await POST(
      new Request("http://localhost/api/agent/connect-claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId: "sys_test" })
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when the system is not in the user's workspace", async () => {
    const { app } = buildBaseApp();
    app.repositories.systems.list = vi.fn().mockResolvedValue([]);
    mockedServer.mockResolvedValue(app);

    const { POST } = await import("@/app/api/agent/connect-claude/route");
    const res = await POST(
      new Request("http://localhost/api/agent/connect-claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId: "sys_other" })
      })
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
  });

  it("returns 400 when systemId is missing", async () => {
    const { app } = buildBaseApp();
    mockedServer.mockResolvedValue(app);

    const { POST } = await import("@/app/api/agent/connect-claude/route");
    const res = await POST(
      new Request("http://localhost/api/agent/connect-claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      })
    );
    expect(res.status).toBe(400);
  });

  it("excludes write capabilities from the issued token", async () => {
    const { app, tokensCreated } = buildBaseApp();
    mockedServer.mockResolvedValue(app);

    const { POST } = await import("@/app/api/agent/connect-claude/route");
    const res = await POST(
      new Request("http://localhost/api/agent/connect-claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId: "sys_test" })
      })
    );
    expect(res.status).toBe(200);

    const caps = tokensCreated[0].capabilities;
    expect(caps).not.toContain("graph:write");
    expect(caps).not.toContain("systems:write");
    expect(caps).not.toContain("versions:write");
    expect(caps).not.toContain("comments:write");
    expect(caps).not.toContain("import:write");
    expect(caps).not.toContain("templates:instantiate");
  });

  it("issues a token with a 24-hour TTL", async () => {
    const { app, auditsCreated } = buildBaseApp();
    mockedServer.mockResolvedValue(app);

    const before = Date.now();
    const { POST } = await import("@/app/api/agent/connect-claude/route");
    const res = await POST(
      new Request("http://localhost/api/agent/connect-claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId: "sys_test" })
      })
    );
    const after = Date.now();
    expect(res.status).toBe(200);

    const body = (await res.json()) as { ok: true; data: { expiresAt: string } };
    const expiresAtMs = new Date(body.data.expiresAt).getTime();
    const minMs = before + 23 * 60 * 60 * 1000;
    const maxMs = after + 25 * 60 * 60 * 1000;
    expect(expiresAtMs).toBeGreaterThanOrEqual(minMs);
    expect(expiresAtMs).toBeLessThanOrEqual(maxMs);

    // The audit row should also carry the 24-hour TTL metadata.
    const tokenAudit = auditsCreated.find((row) => row.action === "token.create");
    expect(tokenAudit).toBeDefined();
    const meta = JSON.parse(tokenAudit!.metadata ?? "{}") as {
      ttlHours: number;
      source: string;
    };
    expect(meta.ttlHours).toBe(24);
    expect(meta.source).toBe("open_in_claude");
  });
});
