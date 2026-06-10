import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockedServer = vi.fn();
vi.mock("@/lib/composition/server", () => ({ getServerApp: mockedServer }));

type RecordedEntry = {
  id: string;
  userId: string;
  workspaceId?: string;
  kind: "thumbs" | "nps" | "free_text";
  targetType?: string;
  targetId?: string;
  conversationId?: string;
  turnId?: string;
  verdict?: "up" | "down";
  score?: number;
  surface?: string;
  text?: string;
  note?: string;
  createdAt: string;
};

let counter = 0;

function buildApp(opts?: { userId?: string }) {
  const userId = opts?.userId ?? `usr_test_${++counter}`;
  const stored: RecordedEntry[] = [];
  const record = vi.fn(async (input: Omit<RecordedEntry, "id" | "createdAt">) => {
    counter += 1;
    const row: RecordedEntry = { ...input, id: `fbe_${counter}`, createdAt: new Date().toISOString() };
    stored.push(row);
    return row;
  });
  const listEntries = vi.fn(async () => stored.slice());
  return {
    stored,
    record,
    listEntries,
    app: {
      identity: { email: "owner@pipes.local", externalId: `mock|${userId}`, name: "Alex Rivera" },
      ctx: { workspaceId: "wks_1", userId, role: "Owner", plan: "Pro", actorType: "user", actorId: userId },
      services: {},
      repositories: {
        feedback: { record, listEntries }
      },
      runtimeMode: "mock",
      runtimeWarning: undefined
    }
  };
}

afterEach(async () => {
  const { resetRateLimit, resetInFlight } = await import("@/lib/agent/rate-limit");
  resetRateLimit();
  resetInFlight();
});

beforeEach(() => {
  mockedServer.mockReset();
});

describe("/api/feedback route", () => {
  it("persists a thumbs entry on the happy path", async () => {
    const { app, record, stored } = buildApp({ userId: "usr_thumbs" });
    mockedServer.mockResolvedValue(app);

    const { POST } = await import("@/app/api/feedback/route");
    const res = await POST(new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "thumbs",
        targetType: "agent_message",
        targetId: "msg_1",
        conversationId: "ac_1",
        turnId: "at_1",
        verdict: "up"
      })
    }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(record).toHaveBeenCalledTimes(1);
    expect(stored).toHaveLength(1);
    expect(stored[0].kind).toBe("thumbs");
    expect(stored[0].verdict).toBe("up");
    expect(stored[0].userId).toBe("usr_thumbs");
    expect(stored[0].workspaceId).toBe("wks_1");
  });

  it("persists an NPS entry with a valid score", async () => {
    const { app, stored } = buildApp({ userId: "usr_nps" });
    mockedServer.mockResolvedValue(app);

    const { POST } = await import("@/app/api/feedback/route");
    const res = await POST(new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "nps", score: 9, note: "Solid." })
    }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(stored).toHaveLength(1);
    expect(stored[0].kind).toBe("nps");
    expect(stored[0].score).toBe(9);
    expect(stored[0].note).toBe("Solid.");
  });

  it("persists a free_text entry", async () => {
    const { app, stored } = buildApp({ userId: "usr_text" });
    mockedServer.mockResolvedValue(app);

    const { POST } = await import("@/app/api/feedback/route");
    const res = await POST(new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "free_text", surface: "editor", text: "More keyboard shortcuts please." })
    }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(stored).toHaveLength(1);
    expect(stored[0].kind).toBe("free_text");
    expect(stored[0].surface).toBe("editor");
    expect(stored[0].text).toBe("More keyboard shortcuts please.");
  });

  it("rejects an unknown kind with 400", async () => {
    const { app, record } = buildApp({ userId: "usr_badkind" });
    mockedServer.mockResolvedValue(app);

    const { POST } = await import("@/app/api/feedback/route");
    const res = await POST(new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "applause", note: "hi" })
    }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(record).not.toHaveBeenCalled();
  });

  it("rejects NPS score above 10 with 400", async () => {
    const { app, record } = buildApp({ userId: "usr_npshigh" });
    mockedServer.mockResolvedValue(app);

    const { POST } = await import("@/app/api/feedback/route");
    const res = await POST(new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "nps", score: 11 })
    }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(record).not.toHaveBeenCalled();
  });

  it("rejects a thumbs body that is missing targetId with 400", async () => {
    const { app, record } = buildApp({ userId: "usr_thumbsbad" });
    mockedServer.mockResolvedValue(app);

    const { POST } = await import("@/app/api/feedback/route");
    const res = await POST(new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "thumbs",
        targetType: "agent_message",
        // targetId omitted
        conversationId: "ac_1",
        turnId: "at_1",
        verdict: "up"
      })
    }));

    expect(res.status).toBe(400);
    expect(record).not.toHaveBeenCalled();
  });

  it("returns 401 when the user is unauthenticated", async () => {
    mockedServer.mockRejectedValue(new Error("Authentication required."));

    const { POST } = await import("@/app/api/feedback/route");
    const res = await POST(new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "free_text", surface: "editor", text: "hi" })
    }));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("returns 413 when the body exceeds the 4 KB cap", async () => {
    const { app, record } = buildApp({ userId: "usr_big" });
    mockedServer.mockResolvedValue(app);

    // 5 KB of text - well above the 4 KB cap.
    const oversized = "x".repeat(5 * 1024);
    const { POST } = await import("@/app/api/feedback/route");
    const res = await POST(new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "free_text", surface: "editor", text: oversized })
    }));

    expect(res.status).toBe(413);
    expect(record).not.toHaveBeenCalled();
  });

  it("returns 429 once the per-user rate limit is exceeded", async () => {
    const { app } = buildApp({ userId: "usr_rl" });
    mockedServer.mockResolvedValue(app);

    const { POST } = await import("@/app/api/feedback/route");
    const fire = () => POST(new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "nps", score: 7 })
    }));

    // 60 should pass, the 61st must hit the rate limit.
    let lastStatus = 0;
    for (let i = 0; i < 60; i += 1) {
      const res = await fire();
      lastStatus = res.status;
      expect(lastStatus).toBe(200);
    }
    const limited = await fire();
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeDefined();
  });
});
