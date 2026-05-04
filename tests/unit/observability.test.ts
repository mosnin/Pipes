import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// We import the helpers AFTER each test resets state, so the
// per-test env is honored. The Sentry / OTEL adapters lazy-load on
// first call; we assert they no-op when env is unset.

const ORIGINAL_ENV = { ...process.env };

beforeEach(async () => {
  vi.resetModules();
  delete process.env.SENTRY_DSN;
  delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const { resetSentryForTests } = await import("@/lib/observability/sentry");
  const { resetOtelForTests } = await import("@/lib/observability/otel");
  const { resetMetricsStoreForTests } = await import("@/lib/observability/metrics-store");
  resetSentryForTests();
  resetOtelForTests();
  resetMetricsStoreForTests();
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
  vi.restoreAllMocks();
});

describe("observability helpers", () => {
  it("recordLatency / recordCounter / recordError do not throw when no exporter is configured", async () => {
    const obs = await import("@/lib/observability");
    expect(() => obs.recordLatency("test.label", 42)).not.toThrow();
    expect(() => obs.recordCounter("test.counter", 1)).not.toThrow();
    expect(() => obs.recordError("test.error", new Error("boom"))).not.toThrow();
  });

  it("dispatches samples to the metrics store when configured", async () => {
    const recorded: Array<{ kind: string; label: string; value: number }> = [];
    const repos = {
      metrics: {
        recordSample: async (sample: { kind: string; label: string; value: number }) => {
          recorded.push({ kind: sample.kind, label: sample.label, value: sample.value });
        },
        listSamples: async () => []
      }
    } as unknown as import("@/lib/repositories/contracts").RepositorySet;

    const { configureMetricsStore } = await import("@/lib/observability/metrics-store");
    configureMetricsStore(async () => repos);

    const obs = await import("@/lib/observability");
    obs.recordLatency("svc.duration", 123, { user: "u_1" });
    obs.recordCounter("svc.hits", 2);
    obs.recordError("svc.fail", new Error("x"));

    // Drain microtasks and the void-async fire-and-forget calls.
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(recorded.length).toBeGreaterThanOrEqual(3);
    const labels = recorded.map((r) => r.label);
    expect(labels).toContain("svc.duration");
    expect(labels).toContain("svc.hits");
    expect(labels).toContain("svc.fail");
  });

  it("startSpan records latency on success", async () => {
    const recorded: Array<{ kind: string; label: string; value: number }> = [];
    const repos = {
      metrics: {
        recordSample: async (sample: { kind: string; label: string; value: number }) => {
          recorded.push({ kind: sample.kind, label: sample.label, value: sample.value });
        },
        listSamples: async () => []
      }
    } as unknown as import("@/lib/repositories/contracts").RepositorySet;

    const { configureMetricsStore } = await import("@/lib/observability/metrics-store");
    configureMetricsStore(async () => repos);

    const obs = await import("@/lib/observability");
    const result = await obs.startSpan("op.run", async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return 42;
    });
    expect(result).toBe(42);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const span = recorded.find((r) => r.label === "op.run.latency_ms");
    expect(span).toBeTruthy();
    expect(span!.value).toBeGreaterThanOrEqual(0);
  });

  it("startSpan records error and rethrows on failure", async () => {
    const recorded: Array<{ kind: string; label: string }> = [];
    const repos = {
      metrics: {
        recordSample: async (sample: { kind: string; label: string }) => {
          recorded.push({ kind: sample.kind, label: sample.label });
        },
        listSamples: async () => []
      }
    } as unknown as import("@/lib/repositories/contracts").RepositorySet;

    const { configureMetricsStore } = await import("@/lib/observability/metrics-store");
    configureMetricsStore(async () => repos);

    const obs = await import("@/lib/observability");
    await expect(obs.startSpan("op.fail", async () => {
      throw new Error("nope");
    })).rejects.toThrow("nope");
    await new Promise((resolve) => setTimeout(resolve, 20));
    const err = recorded.find((r) => r.kind === "error" && r.label === "op.fail.error");
    expect(err).toBeTruthy();
  });

  it("isSentryConfigured / isOtelConfigured reflect env presence", async () => {
    {
      const { isSentryConfigured } = await import("@/lib/observability/sentry");
      const { isOtelConfigured } = await import("@/lib/observability/otel");
      expect(isSentryConfigured()).toBe(false);
      expect(isOtelConfigured()).toBe(false);
    }
    process.env.SENTRY_DSN = "https://example@sentry.io/1";
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "https://otel.example.com";
    vi.resetModules();
    {
      const { isSentryConfigured } = await import("@/lib/observability/sentry");
      const { isOtelConfigured } = await import("@/lib/observability/otel");
      expect(isSentryConfigured()).toBe(true);
      expect(isOtelConfigured()).toBe(true);
    }
  });
});
