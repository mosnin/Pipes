import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/composition/server", () => ({ getServerApp: vi.fn() }));

vi.mock("@/lib/env", () => ({
  env: {},
  runtimeFlags: { useMocks: true, hasOpenAI: false, hasOpenRouter: false },
  DEFAULT_OPENROUTER_MODEL: "test-model",
}));

import { POST as compilePOST } from "@/app/api/compile/route";
import { POST as buildPOST } from "@/app/api/build/route";

function req(body: unknown): Request {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/compile", () => {
  it("returns ok with compiled graph for valid SOP input", async () => {
    const res = await compilePOST(req({ content: "x".repeat(20), docType: "sop" }));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.systemName).toBeTruthy();
    expect(Array.isArray(json.data.nodes)).toBe(true);
    expect(json.data.nodes.length).toBeGreaterThanOrEqual(2);
  });

  it("returns ok for all four doc types", async () => {
    for (const docType of ["sop", "api_spec", "documentation", "book"] as const) {
      const res = await compilePOST(req({ content: "x".repeat(20), docType }));
      const json = await res.json();
      expect(json.ok).toBe(true);
    }
  });

  it("returns 400 for content that is too short", async () => {
    const res = await compilePOST(req({ content: "short", docType: "sop" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("defaults docType to documentation when omitted", async () => {
    const res = await compilePOST(req({ content: "x".repeat(20) }));
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns 400 for invalid docType value", async () => {
    const res = await compilePOST(req({ content: "x".repeat(20), docType: "invalid" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("returns 400 for missing content", async () => {
    const res = await compilePOST(req({ docType: "sop" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });
});

describe("POST /api/build", () => {
  it("returns ok with a DAG for a valid goal", async () => {
    const res = await buildPOST(req({ goal: "Process customer support emails", parallelism: "auto" }));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.executionPlan).toBeDefined();
    expect(Array.isArray(json.data.executionPlan.levels)).toBe(true);
    expect(json.data.nodes.length).toBeGreaterThan(0);
  });

  it("accepts all three parallelism modes", async () => {
    for (const parallelism of ["auto", "parallel", "sequential"] as const) {
      const res = await buildPOST(req({ goal: "test goal here", parallelism }));
      const json = await res.json();
      expect(json.ok).toBe(true);
    }
  });

  it("defaults parallelism to auto when omitted", async () => {
    const res = await buildPOST(req({ goal: "valid goal text" }));
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns 400 for goal that is too short", async () => {
    const res = await buildPOST(req({ goal: "hi", parallelism: "auto" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("returns 400 for missing goal", async () => {
    const res = await buildPOST(req({ parallelism: "auto" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });

  it("returns 400 for invalid parallelism value", async () => {
    const res = await buildPOST(req({ goal: "valid goal text", parallelism: "maybe" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.ok).toBe(false);
  });
});
