import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Mock the env module before importing the module under test.
// ---------------------------------------------------------------------------

const mockRuntimeFlags = vi.hoisted(() => ({
  useMocks: true,
  hasOpenAI: false,
  hasOpenRouter: false,
}));

vi.mock("@/lib/env", () => ({
  env: {
    OPENAI_API_KEY: "test-key",
    OPENROUTER_API_KEY: "test-or-key",
    OPENROUTER_BASE_URL: "https://openrouter.example",
    OPENROUTER_MODEL: "test-model",
    NEXT_PUBLIC_APP_URL: "http://localhost",
  },
  runtimeFlags: mockRuntimeFlags,
  DEFAULT_OPENROUTER_MODEL: "test-model",
}));

import { generateStructured } from "@/lib/ai/structured";

// ---------------------------------------------------------------------------

const TestSchema = z.object({
  name: z.string(),
  value: z.number(),
});

// Provider selection logic (mirrors index.ts/compiler.ts pattern):
// 1. hasOpenRouter → always use OpenRouter (even when useMocks=true)
// 2. !useMocks && hasOpenAI → use OpenAI
// 3. otherwise → mock

describe("generateStructured", () => {
  beforeEach(() => {
    mockRuntimeFlags.useMocks = true;
    mockRuntimeFlags.hasOpenAI = false;
    mockRuntimeFlags.hasOpenRouter = false;
    vi.restoreAllMocks();
  });

  it("returns mock when no provider is configured", async () => {
    const result = await generateStructured({
      system: "s",
      user: "u",
      schema: TestSchema,
      mock: () => ({ name: "mock-result", value: 42 }),
    });
    expect(result).toEqual({ name: "mock-result", value: 42 });
  });

  it("returns mock when useMocks=true and only OpenAI is present", async () => {
    mockRuntimeFlags.useMocks = true;
    mockRuntimeFlags.hasOpenAI = true;
    const result = await generateStructured({
      system: "s",
      user: "u",
      schema: TestSchema,
      mock: () => ({ name: "should-use-mock", value: 1 }),
    });
    expect(result).toEqual({ name: "should-use-mock", value: 1 });
  });

  it("calls OpenRouter when hasOpenRouter=true (OpenRouter supersedes useMocks)", async () => {
    mockRuntimeFlags.useMocks = true;
    mockRuntimeFlags.hasOpenRouter = true;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ name: "from-openrouter", value: 7 }) } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const result = await generateStructured({
      system: "sys",
      user: "usr",
      schema: TestSchema,
      mock: () => ({ name: "should-not-use", value: -1 }),
    });
    expect(result).toEqual({ name: "from-openrouter", value: 7 });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("openrouter");
    const body = JSON.parse(init.body as string);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].role).toBe("user");
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("calls OpenAI when useMocks=false, hasOpenAI=true, and no OpenRouter", async () => {
    mockRuntimeFlags.useMocks = false;
    mockRuntimeFlags.hasOpenAI = true;
    mockRuntimeFlags.hasOpenRouter = false;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ name: "from-openai", value: 3 }) } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const result = await generateStructured({
      system: "sys",
      user: "usr",
      schema: TestSchema,
      mock: () => ({ name: "should-not-use", value: -1 }),
    });
    expect(result).toEqual({ name: "from-openai", value: 3 });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("openai.com");
  });

  it("strips markdown code fences from model output before parsing", async () => {
    mockRuntimeFlags.useMocks = false;
    mockRuntimeFlags.hasOpenRouter = true;
    const fenced = "```json\n" + JSON.stringify({ name: "fenced", value: 5 }) + "\n```";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ choices: [{ message: { content: fenced } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const result = await generateStructured({
      system: "s",
      user: "u",
      schema: TestSchema,
      mock: () => ({ name: "x", value: 0 }),
    });
    expect(result).toEqual({ name: "fenced", value: 5 });
  });

  it("throws a clear error when model returns malformed JSON", async () => {
    mockRuntimeFlags.useMocks = false;
    mockRuntimeFlags.hasOpenRouter = true;
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "not-valid-json{{{" } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    await expect(
      generateStructured({ system: "s", user: "u", schema: TestSchema, mock: () => ({ name: "x", value: 0 }) }),
    ).rejects.toThrow("malformed JSON");
  });

  it("throws when OpenRouter returns non-OK status", async () => {
    mockRuntimeFlags.useMocks = false;
    mockRuntimeFlags.hasOpenRouter = true;
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("rate limited", { status: 429 }),
    );
    await expect(
      generateStructured({ system: "s", user: "u", schema: TestSchema, mock: () => ({ name: "x", value: 0 }) }),
    ).rejects.toThrow("openrouter_429");
  });

  it("throws when output fails Zod schema validation", async () => {
    mockRuntimeFlags.useMocks = false;
    mockRuntimeFlags.hasOpenRouter = true;
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ name: "ok", value: "not-a-number" }) } }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    await expect(
      generateStructured({ system: "s", user: "u", schema: TestSchema, mock: () => ({ name: "x", value: 0 }) }),
    ).rejects.toThrow();
  });
});
