import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.REDIS_URL;
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
});

describe("rate-limit adapter selection", () => {
  it("falls back to in-memory when neither UPSTASH_REDIS_REST_URL nor REDIS_URL is set", async () => {
    const mod = await import("@/lib/agent/rate-limit");
    mod.resetRateLimiterAdapterForTests();
    expect(mod.getRateLimiterMode()).toBe("memory");
    const allowed = mod.checkRateLimit("k:mem", 2, 60_000);
    expect(allowed.ok).toBe(true);
  });

  it("selects redis when UPSTASH_REDIS_REST_URL and token are set", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    const mod = await import("@/lib/agent/rate-limit");
    mod.resetRateLimiterAdapterForTests();
    expect(mod.getRateLimiterMode()).toBe("redis");
  });

  it("checkRateLimitAsync uses Redis when configured and respects INCR-driven limits", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    // Smart mock: distinguish INCR (counts towards limit) from PEXPIRE / PTTL.
    let counter = 0;
    const fakeFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) as Array<string | number> : [];
      const cmd = String(body[0] ?? "").toUpperCase();
      let result: unknown = 1;
      if (cmd === "INCR") {
        counter += 1;
        result = counter;
      } else if (cmd === "PTTL") {
        result = 5_000;
      } else if (cmd === "DECR") {
        counter = Math.max(0, counter - 1);
        result = counter;
      } else if (cmd === "SET") {
        result = "OK";
      } else {
        result = 1;
      }
      return new Response(JSON.stringify({ result }), { status: 200 });
    });
    vi.stubGlobal("fetch", fakeFetch);

    const mod = await import("@/lib/agent/rate-limit");
    mod.resetRateLimiterAdapterForTests();

    const r1 = await mod.checkRateLimitAsync("k:redis", 2, 5_000);
    expect(r1.ok).toBe(true);
    const r2 = await mod.checkRateLimitAsync("k:redis", 2, 5_000);
    expect(r2.ok).toBe(true);
    const r3 = await mod.checkRateLimitAsync("k:redis", 2, 5_000);
    expect(r3.ok).toBe(false);
    expect(fakeFetch).toHaveBeenCalled();
  });

  it("checkRateLimitAsync gracefully handles redis fetch failure", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));

    const mod = await import("@/lib/agent/rate-limit");
    mod.resetRateLimiterAdapterForTests();

    // Failure path falls back to in-memory limiter; first call must succeed.
    const r1 = await mod.checkRateLimitAsync("k:fail", 1, 5_000);
    expect(r1.ok).toBe(true);
  });

  it("acquireSlotAsync respects redis SET NX response shape", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    let firstCall = true;
    vi.stubGlobal("fetch", vi.fn(async () => {
      const body = firstCall ? { result: "OK" } : { result: null };
      firstCall = false;
      return new Response(JSON.stringify(body), { status: 200 });
    }));

    const mod = await import("@/lib/agent/rate-limit");
    mod.resetRateLimiterAdapterForTests();
    const a = await mod.acquireSlotAsync("u:1", 1);
    const b = await mod.acquireSlotAsync("u:1", 1);
    expect(a).toBe(true);
    expect(b).toBe(false);
  });
});
