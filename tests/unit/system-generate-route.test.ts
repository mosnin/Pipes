import { describe, expect, it, vi } from "vitest";

const mockedServer = vi.fn();
vi.mock("@/lib/composition/server", () => ({ getServerApp: mockedServer }));
vi.mock("@/lib/env", () => ({ runtimeFlags: { hasOpenRouter: false } }));

type MutateCall = { action: string; [k: string]: unknown };

function buildApp() {
  const calls: MutateCall[] = [];
  let nodeSeq = 0;
  const services = {
    access: { ensureCanEdit: vi.fn() },
    systems: { getBundle: vi.fn(async () => ({ system: { name: "Test" }, nodes: [], pipes: [] })) },
    graph: {
      mutate: vi.fn(async (_ctx: unknown, payload: MutateCall) => {
        calls.push(payload);
        if (payload.action === "addNode") return `node_${nodeSeq++}`;
        return undefined;
      }),
    },
  };
  mockedServer.mockResolvedValue({ ctx: { workspaceId: "w" }, services });
  return { calls, services };
}

async function callGenerate(prompt: string) {
  const { POST } = await import("@/app/api/systems/[systemId]/generate/route");
  const req = new Request("http://localhost/api/systems/s1/generate", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
  return POST(req, { params: Promise.resolve({ systemId: "s1" }) });
}

describe("POST /api/systems/[systemId]/generate", () => {
  it("persists a heuristic loop, mapping client node ids to real ids in pipes", async () => {
    const { calls } = buildApp();
    const res = await callGenerate("triage support tickets and escalate to a human");
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);

    const addNodes = calls.filter((c) => c.action === "addNode");
    const addPipes = calls.filter((c) => c.action === "addPipe");
    expect(addNodes.length).toBeGreaterThanOrEqual(3);
    expect(addPipes.length).toBeGreaterThanOrEqual(addNodes.length - 1);

    // Every pipe references a persisted (real) node id, never a tmp client id.
    const realIds = new Set(addNodes.map((_, i) => `node_${i}`));
    for (const pipe of addPipes) {
      expect(realIds.has(pipe.fromNodeId as string)).toBe(true);
      expect(realIds.has(pipe.toNodeId as string)).toBe(true);
    }
  });

  it("rejects an empty prompt", async () => {
    buildApp();
    const res = await callGenerate("   ");
    expect(res.status).toBe(400);
  });
});
