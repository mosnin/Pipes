import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockedServer = vi.fn();
vi.mock("@/lib/composition/server", () => ({ getServerApp: mockedServer }));

type Metric = { userId: string; workspaceId: string; monthKey: string; buildsUsed: number; updatedAt: string };

function buildApp(opts: { plan: string; metric?: Metric | null }) {
  const getMonthly = vi.fn(async () => opts.metric ?? null);
  const app = {
    identity: { email: "owner@pipes.local", externalId: "mock|usr_1", name: "Alex" },
    ctx: {
      workspaceId: "wks_1",
      userId: "usr_1",
      actorType: "user" as const,
      actorId: "usr_1",
      role: "Owner" as const,
      plan: opts.plan,
    },
    services: {},
    repositories: {
      agentRunnerMetrics: {
        getMonthly,
        incrementMonthly: vi.fn(),
      },
    },
    runtimeMode: "mock" as const,
    runtimeWarning: undefined as string | undefined,
  };
  return { app, getMonthly };
}

beforeEach(() => {
  mockedServer.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("/api/billing/usage route", () => {
  it("returns used + limit + plan for a Free-tier user with prior usage", async () => {
    const { app, getMonthly } = buildApp({
      plan: "Free",
      metric: {
        userId: "usr_1",
        workspaceId: "wks_1",
        monthKey: new Date().toISOString().slice(0, 7),
        buildsUsed: 12,
        updatedAt: new Date().toISOString(),
      },
    });
    mockedServer.mockResolvedValue(app);

    const { GET } = await import("@/app/api/billing/usage/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; data: { used: number; limit: number; plan: string } };
    expect(body.ok).toBe(true);
    expect(body.data.used).toBe(12);
    expect(body.data.limit).toBe(50);
    expect(body.data.plan).toBe("Free");
    expect(getMonthly).toHaveBeenCalledTimes(1);
  });

  it("returns 0 used when no prior metric row exists", async () => {
    const { app } = buildApp({ plan: "Free", metric: null });
    mockedServer.mockResolvedValue(app);

    const { GET } = await import("@/app/api/billing/usage/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; data: { used: number } };
    expect(body.data.used).toBe(0);
  });

  it("returns null limit (unlimited) for a Pro user", async () => {
    const { app } = buildApp({ plan: "Pro", metric: null });
    mockedServer.mockResolvedValue(app);

    const { GET } = await import("@/app/api/billing/usage/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; data: { used: number; limit: number | null; plan: string } };
    expect(body.data.plan).toBe("Pro");
    // Infinity serializes to null in JSON — client treats null as unlimited
    expect(body.data.limit).toBeNull();
  });

  it("returns null limit (unlimited) for a Builder user", async () => {
    const { app } = buildApp({ plan: "Builder", metric: null });
    mockedServer.mockResolvedValue(app);

    const { GET } = await import("@/app/api/billing/usage/route");
    const res = await GET();
    const body = (await res.json()) as { ok: boolean; data: { limit: number | null } };
    // Infinity serializes to null in JSON — client treats null as unlimited
    expect(body.data.limit).toBeNull();
  });

  it("returns 401 when auth fails", async () => {
    mockedServer.mockRejectedValue(new Error("Authentication required"));
    const { GET } = await import("@/app/api/billing/usage/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
