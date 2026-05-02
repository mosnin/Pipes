import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockedServer = vi.fn();
vi.mock("@/lib/composition/server", () => ({ getServerApp: mockedServer }));

const mockedEnv = vi.hoisted(() => ({
  env: {} as Record<string, unknown>,
  runtimeFlags: { useMocks: true, hasAgentRunner: false } as { useMocks: boolean; hasAgentRunner: boolean }
}));
vi.mock("@/lib/env", () => ({
  env: mockedEnv.env,
  runtimeFlags: mockedEnv.runtimeFlags
}));

const FIXTURES_DIR = path.join(process.cwd(), "tests", "fixtures", "agent-build");
const FIXTURE_OVERRIDES: string[] = [];

type Frame = { event: string; data: Record<string, unknown> };

async function readSse(response: Response): Promise<Frame[]> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const frames: Frame[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    while (true) {
      const sep = buffer.indexOf("\n\n");
      if (sep < 0) break;
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      let event = "message";
      const dataLines: string[] = [];
      for (const line of block.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length > 0) {
        frames.push({ event, data: JSON.parse(dataLines.join("\n")) as Record<string, unknown> });
      }
    }
  }
  return frames;
}

function buildBaseApp() {
  const conversationStore: Array<{ id: string; systemId: string; userId: string }> = [];
  const turnStore: Array<{ id: string; conversationId: string; index: number; toolCalls: unknown[]; finalMessage?: string; cancelled: boolean; completedAt?: string }> = [];
  let convCounter = 0;
  let turnCounter = 0;

  const ensureCanEdit = vi.fn();
  const systemsList = vi.fn().mockResolvedValue([
    { id: "sys_test", workspaceId: "wks_1", name: "Test", description: "", createdBy: "usr_1", createdAt: "", updatedAt: "" }
  ]);

  const agentConversations = {
    createConversation: vi.fn(async (input: { systemId: string; userId: string }) => {
      const row = { id: `ac_${++convCounter}`, ...input, createdAt: "", updatedAt: "" };
      conversationStore.push(row);
      return row;
    }),
    getConversation: vi.fn(async (id: string) => conversationStore.find((c) => c.id === id) ?? null),
    listConversations: vi.fn(async () => []),
    touchConversation: vi.fn(async () => undefined),
    createTurn: vi.fn(async (input: { conversationId: string; index: number; prompt: string; startedAt: string }) => {
      const row = { id: `at_${++turnCounter}`, conversationId: input.conversationId, index: input.index, toolCalls: [] as unknown[], cancelled: false } as { id: string; conversationId: string; index: number; toolCalls: unknown[]; finalMessage?: string; cancelled: boolean; completedAt?: string };
      turnStore.push(row);
      return { ...row, prompt: input.prompt, startedAt: input.startedAt, toolCalls: [] };
    }),
    listTurns: vi.fn(async (conversationId: string) => turnStore.filter((t) => t.conversationId === conversationId)),
    appendToolCall: vi.fn(async (input: { turnId: string; toolCall: unknown }) => {
      const row = turnStore.find((t) => t.id === input.turnId);
      if (row) row.toolCalls.push(input.toolCall);
    }),
    completeTurn: vi.fn(async (input: { turnId: string; finalMessage?: string; completedAt: string; cancelled: boolean }) => {
      const row = turnStore.find((t) => t.id === input.turnId);
      if (row) {
        row.finalMessage = input.finalMessage;
        row.completedAt = input.completedAt;
        row.cancelled = input.cancelled;
      }
    })
  };

  const app = {
    identity: { email: "owner@pipes.local", externalId: "mock|usr_1", name: "Alex" },
    ctx: { workspaceId: "wks_1", userId: "usr_1", actorType: "user", actorId: "usr_1", role: "Owner", plan: "Pro" },
    services: { access: { ensureCanEdit, ensureCanView: vi.fn(), ensureCanComment: vi.fn(), ensureCanManageMembers: vi.fn(), ensureInternalOperator: vi.fn() } },
    repositories: {
      systems: { list: systemsList },
      agentConversations
    },
    runtimeMode: "mock",
    runtimeWarning: undefined
  };

  return { app, agentConversations, turnStore, conversationStore };
}

afterEach(async () => {
  for (const file of FIXTURE_OVERRIDES) {
    await fs.unlink(file).catch(() => undefined);
  }
  FIXTURE_OVERRIDES.length = 0;
  mockedEnv.runtimeFlags.useMocks = true;
  mockedEnv.runtimeFlags.hasAgentRunner = false;
});

beforeEach(() => {
  mockedServer.mockReset();
});

describe("/api/agent/build route", () => {
  it("streams the canned fixture in mock mode and persists the turn", async () => {
    const { app, agentConversations, turnStore } = buildBaseApp();
    mockedServer.mockResolvedValue(app);

    const { POST } = await import("@/app/api/agent/build/route");
    const res = await POST(new Request("http://localhost/api/agent/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemId: "sys_test", prompt: "Two nodes please" })
    }));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const frames = await readSse(res);
    expect(frames.length).toBeGreaterThan(0);

    const eventTypes = frames.map((f) => f.event);
    expect(eventTypes[0]).toBe("status");
    expect(eventTypes.at(-1)).toBe("done");
    const toolCalls = frames.filter((f) => f.event === "tool_call");
    const toolResults = frames.filter((f) => f.event === "tool_result");
    expect(toolCalls.length).toBe(toolResults.length);
    for (const call of toolCalls) {
      const matched = toolResults.find((r) => r.data.id === call.data.id);
      expect(matched).toBeDefined();
    }

    expect(agentConversations.createConversation).toHaveBeenCalledTimes(1);
    expect(agentConversations.createTurn).toHaveBeenCalledTimes(1);
    expect(turnStore[0].toolCalls.length).toBe(toolResults.length);
    expect(turnStore[0].cancelled).toBe(false);
    expect(turnStore[0].completedAt).toBeDefined();

    // <runtime> placeholders are substituted in the done event.
    const done = frames.find((f) => f.event === "done")!;
    expect(done.data.conversationId).toMatch(/^ac_/);
    expect(done.data.turnId).toMatch(/^at_/);
  });

  it("emits tool_call_limit_exceeded when fixture has more than 30 tool calls", async () => {
    const { app, turnStore } = buildBaseApp();
    mockedServer.mockResolvedValue(app);

    // Build a 31-tool-call fixture and pin it via prompt hash.
    const prompt = "trigger cap test";
    const { createHash } = await import("node:crypto");
    const hash = createHash("sha256").update(prompt).digest("hex").slice(0, 12);
    const fixturePath = path.join(FIXTURES_DIR, `${hash}.json`);
    const frames: Array<{ event: string; data: Record<string, unknown>; delay_ms?: number }> = [];
    for (let i = 1; i <= 31; i += 1) {
      frames.push({ event: "tool_call", data: { id: `tc_${i}`, tool_name: "add_node", arguments: { title: `N${i}` } } });
      frames.push({ event: "tool_result", data: { id: `tc_${i}`, ok: true, action: { action: "addNode", systemId: "<runtime>", type: "Node", title: `N${i}`, x: 0, y: 0, clientNodeId: `tmp_${i}` } } });
    }
    frames.push({ event: "done", data: { conversationId: "<runtime>", turnId: "<runtime>" } });
    await fs.writeFile(fixturePath, JSON.stringify(frames), "utf8");
    FIXTURE_OVERRIDES.push(fixturePath);

    const { POST } = await import("@/app/api/agent/build/route");
    const res = await POST(new Request("http://localhost/api/agent/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemId: "sys_test", prompt })
    }));

    const out = await readSse(res);
    const errorFrame = out.find((f) => f.event === "error");
    expect(errorFrame).toBeDefined();
    expect(errorFrame!.data.code).toBe("tool_call_limit_exceeded");
    expect(errorFrame!.data.retryable).toBe(false);
    expect(out.find((f) => f.event === "done")).toBeUndefined();
    expect(turnStore[0].cancelled).toBe(true);
  });

  it("stops persisting when the request is aborted", async () => {
    const { app, turnStore } = buildBaseApp();
    mockedServer.mockResolvedValue(app);

    // Build a fixture with delays so we can abort mid-stream.
    const prompt = "abort mid stream";
    const { createHash } = await import("node:crypto");
    const hash = createHash("sha256").update(prompt).digest("hex").slice(0, 12);
    const fixturePath = path.join(FIXTURES_DIR, `${hash}.json`);
    const frames = [
      { delay_ms: 0, event: "status", data: { state: "thinking" } },
      { delay_ms: 0, event: "tool_call", data: { id: "tc_1", tool_name: "add_node", arguments: { title: "A" } } },
      { delay_ms: 0, event: "tool_result", data: { id: "tc_1", ok: true, action: { action: "addNode", systemId: "<runtime>", type: "Node", title: "A", x: 0, y: 0, clientNodeId: "tmp_a" } } },
      { delay_ms: 200, event: "tool_call", data: { id: "tc_2", tool_name: "add_node", arguments: { title: "B" } } },
      { delay_ms: 0, event: "tool_result", data: { id: "tc_2", ok: true, action: { action: "addNode", systemId: "<runtime>", type: "Node", title: "B", x: 0, y: 0, clientNodeId: "tmp_b" } } },
      { delay_ms: 0, event: "done", data: { conversationId: "<runtime>", turnId: "<runtime>" } }
    ];
    await fs.writeFile(fixturePath, JSON.stringify(frames), "utf8");
    FIXTURE_OVERRIDES.push(fixturePath);

    const controller = new AbortController();
    const { POST } = await import("@/app/api/agent/build/route");
    const res = await POST(new Request("http://localhost/api/agent/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemId: "sys_test", prompt }),
      signal: controller.signal
    }));

    // Read first frame, then abort.
    const reader = res.body!.getReader();
    await reader.read();
    controller.abort();
    // Drain remaining (will end shortly).
    try {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    } catch { /* abort errors swallowed */ }

    // The turn should be marked cancelled.
    expect(turnStore[0].cancelled).toBe(true);
  });

  it("returns 400 on malformed JSON body", async () => {
    const { app } = buildBaseApp();
    mockedServer.mockResolvedValue(app);

    const { POST } = await import("@/app/api/agent/build/route");
    const res = await POST(new Request("http://localhost/api/agent/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json"
    }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when systemId is missing", async () => {
    const { app } = buildBaseApp();
    mockedServer.mockResolvedValue(app);

    const { POST } = await import("@/app/api/agent/build/route");
    const res = await POST(new Request("http://localhost/api/agent/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "hi" })
    }));
    expect(res.status).toBe(400);
  });

  it("returns 403 when the system is not in the workspace", async () => {
    const { app } = buildBaseApp();
    app.repositories.systems.list = vi.fn().mockResolvedValue([]);
    mockedServer.mockResolvedValue(app);

    const { POST } = await import("@/app/api/agent/build/route");
    const res = await POST(new Request("http://localhost/api/agent/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemId: "sys_other", prompt: "hi" })
    }));
    expect(res.status).toBe(403);
  });

  it("returns 401 when auth fails", async () => {
    mockedServer.mockRejectedValue(new Error("Authentication required"));
    const { POST } = await import("@/app/api/agent/build/route");
    const res = await POST(new Request("http://localhost/api/agent/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemId: "sys_test", prompt: "hi" })
    }));
    expect(res.status).toBe(401);
  });

  it("rejects a foreign conversationId", async () => {
    const { app, agentConversations } = buildBaseApp();
    agentConversations.getConversation = vi.fn().mockResolvedValue({ id: "ac_other", systemId: "sys_test", userId: "stranger", createdAt: "", updatedAt: "" });
    mockedServer.mockResolvedValue(app);

    const { POST } = await import("@/app/api/agent/build/route");
    const res = await POST(new Request("http://localhost/api/agent/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemId: "sys_test", prompt: "hi", conversationId: "ac_other" })
    }));
    expect(res.status).toBe(403);
  });
});
