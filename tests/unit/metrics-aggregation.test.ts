import { describe, expect, it } from "vitest";
import {
  aggregateAll,
  aggregateBuildsDaily,
  aggregateCostDaily,
  aggregateErrorsHourly,
  aggregateLatencyHourly,
  mulberry32,
  percentile,
  seedMockSamples,
} from "@/lib/observability/metrics-aggregation";
import type { MetricsSampleRecord } from "@/lib/repositories/contracts";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const NOW = Date.parse("2025-06-01T12:00:00Z");

function makeSample(partial: Partial<MetricsSampleRecord> & { ts: string }): MetricsSampleRecord {
  return {
    id: partial.id ?? "met_x",
    kind: partial.kind ?? "latency",
    label: partial.label ?? "agent_build.duration_ms",
    value: partial.value ?? 100,
    tags: partial.tags,
    ts: partial.ts,
  };
}

describe("percentile", () => {
  it("returns 0 for an empty array", () => {
    expect(percentile([], 50)).toBe(0);
    expect(percentile([], 95)).toBe(0);
  });

  it("returns the nearest-rank value", () => {
    const sorted = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(percentile(sorted, 0)).toBe(10);
    expect(percentile(sorted, 50)).toBe(60);
    expect(percentile(sorted, 95)).toBe(100);
  });

  it("clamps p to the [0,100] range", () => {
    const sorted = [5, 10, 15];
    expect(percentile(sorted, -5)).toBe(5);
    expect(percentile(sorted, 150)).toBe(15);
  });
});

describe("aggregateLatencyHourly", () => {
  it("emits zero buckets when no samples exist", () => {
    const out = aggregateLatencyHourly([], NOW, 24);
    expect(out).toHaveLength(24);
    expect(out.every((b) => b.p50 === 0 && b.p95 === 0)).toBe(true);
  });

  it("buckets samples by hour and computes p50 / p95", () => {
    // Put 10 latency samples in the same hour bucket (1 hour ago).
    const oneHourAgo = NOW - HOUR_MS;
    const samples: MetricsSampleRecord[] = [];
    for (let i = 1; i <= 10; i += 1) {
      samples.push(
        makeSample({
          id: `met_${i}`,
          kind: "latency",
          label: "agent_build.duration_ms",
          value: i * 100, // 100, 200, ..., 1000
          ts: new Date(oneHourAgo + 30 * 1000).toISOString(), // 30s into that hour
        }),
      );
    }
    const out = aggregateLatencyHourly(samples, NOW, 24);
    expect(out).toHaveLength(24);
    // Find the bucket that has all 10 samples.
    const populated = out.filter((b) => b.p95 > 0);
    expect(populated).toHaveLength(1);
    expect(populated[0].p50).toBeGreaterThan(0);
    expect(populated[0].p95).toBeGreaterThanOrEqual(populated[0].p50);
    // For 10 values [100..1000], floor(0.5*10)=5 -> idx 5 -> 600; floor(0.95*10)=9 -> idx 9 -> 1000.
    expect(populated[0].p50).toBe(600);
    expect(populated[0].p95).toBe(1000);
  });

  it("ignores samples outside the window and non-matching labels", () => {
    const samples: MetricsSampleRecord[] = [
      makeSample({ id: "old", value: 999, ts: new Date(NOW - 48 * HOUR_MS).toISOString() }),
      makeSample({
        id: "wrong",
        label: "agent_build.tokens_in",
        value: 999,
        ts: new Date(NOW - HOUR_MS).toISOString(),
      }),
    ];
    const out = aggregateLatencyHourly(samples, NOW, 24);
    expect(out.every((b) => b.p50 === 0 && b.p95 === 0)).toBe(true);
  });

  it("buckets are oldest-first and span the requested window", () => {
    const out = aggregateLatencyHourly([], NOW, 24);
    const firstTs = Date.parse(out[0].ts);
    const lastTs = Date.parse(out[out.length - 1].ts);
    expect(lastTs - firstTs).toBe(23 * HOUR_MS);
    expect(lastTs).toBeLessThanOrEqual(NOW);
  });
});

describe("aggregateBuildsDaily", () => {
  it("returns N daily buckets oldest-first", () => {
    const out = aggregateBuildsDaily([], NOW, 14);
    expect(out).toHaveLength(14);
    expect(out.every((b) => b.count === 0)).toBe(true);
    // Date order strictly ascending.
    for (let i = 1; i < out.length; i += 1) {
      expect(out[i].date >= out[i - 1].date).toBe(true);
    }
  });

  it("counts builds in their bucket", () => {
    const samples: MetricsSampleRecord[] = [];
    // 3 builds today, 2 yesterday.
    for (let i = 0; i < 3; i += 1) {
      samples.push(
        makeSample({
          id: `b_today_${i}`,
          kind: "counter",
          label: "agent_build.request",
          value: 1,
          ts: new Date(NOW - 30 * 60 * 1000).toISOString(),
        }),
      );
    }
    for (let i = 0; i < 2; i += 1) {
      samples.push(
        makeSample({
          id: `b_yest_${i}`,
          kind: "counter",
          label: "agent_build.request",
          value: 1,
          ts: new Date(NOW - DAY_MS - 30 * 60 * 1000).toISOString(),
        }),
      );
    }
    const out = aggregateBuildsDaily(samples, NOW, 14);
    const total = out.reduce((acc, b) => acc + b.count, 0);
    expect(total).toBe(5);
  });
});

describe("aggregateErrorsHourly", () => {
  it("returns zeros when no errors exist", () => {
    const out = aggregateErrorsHourly([], NOW, 24);
    expect(out).toHaveLength(24);
    expect(out.every((b) => b.count === 0)).toBe(true);
  });

  it("counts only error-kind samples", () => {
    const samples: MetricsSampleRecord[] = [
      makeSample({ id: "e1", kind: "error", label: "agent_build.error", value: 1, ts: new Date(NOW - 2 * HOUR_MS).toISOString() }),
      makeSample({ id: "e2", kind: "error", label: "agent_build.error", value: 1, ts: new Date(NOW - 2 * HOUR_MS).toISOString() }),
      makeSample({ id: "ok", kind: "counter", label: "agent_build.request", value: 1, ts: new Date(NOW - 2 * HOUR_MS).toISOString() }),
    ];
    const out = aggregateErrorsHourly(samples, NOW, 24);
    const total = out.reduce((acc, b) => acc + b.count, 0);
    expect(total).toBe(2);
  });
});

describe("aggregateCostDaily", () => {
  it("sums tokens_in and tokens_out per day", () => {
    const samples: MetricsSampleRecord[] = [
      makeSample({ id: "tin1", kind: "counter", label: "agent_build.tokens_in", value: 100, ts: new Date(NOW).toISOString() }),
      makeSample({ id: "tin2", kind: "counter", label: "agent_build.tokens_in", value: 50, ts: new Date(NOW).toISOString() }),
      makeSample({ id: "tout1", kind: "counter", label: "agent_build.tokens_out", value: 25, ts: new Date(NOW).toISOString() }),
    ];
    const out = aggregateCostDaily(samples, NOW, 7);
    expect(out).toHaveLength(7);
    const todayBucket = out[out.length - 1];
    expect(todayBucket.tokensIn).toBe(150);
    expect(todayBucket.tokensOut).toBe(25);
  });
});

describe("aggregateAll", () => {
  it("produces all four series in one call with sensible empty defaults", () => {
    const result = aggregateAll([], NOW);
    expect(result.latencyHourly).toHaveLength(24);
    expect(result.buildsDaily).toHaveLength(14);
    expect(result.errorsHourly).toHaveLength(24);
    expect(result.costWeekly).toHaveLength(7);
  });

  it("respects custom window sizes", () => {
    const result = aggregateAll([], NOW, {
      latencyHours: 6,
      buildDays: 3,
      errorHours: 12,
      costDays: 2,
    });
    expect(result.latencyHourly).toHaveLength(6);
    expect(result.buildsDaily).toHaveLength(3);
    expect(result.errorsHourly).toHaveLength(12);
    expect(result.costWeekly).toHaveLength(2);
  });
});

describe("seedMockSamples", () => {
  it("is deterministic for the same seed", () => {
    const a = seedMockSamples(NOW, 42);
    const b = seedMockSamples(NOW, 42);
    expect(a.length).toBe(b.length);
    expect(a[0].value).toBe(b[0].value);
    expect(a[0].ts).toBe(b[0].ts);
  });

  it("produces enough latency samples to populate the chart cleanly", () => {
    const samples = seedMockSamples(NOW, 1);
    const withId = samples.map((s, i) => ({ ...s, id: `seed_${i}` }));
    const aggregated = aggregateAll(withId, NOW);
    // At least half the latency buckets should have signal.
    const populated = aggregated.latencyHourly.filter((b) => b.p50 > 0).length;
    expect(populated).toBeGreaterThan(12);
    // And the seed must include at least one bucket with builds.
    const totalBuilds = aggregated.buildsDaily.reduce((acc, b) => acc + b.count, 0);
    expect(totalBuilds).toBeGreaterThan(0);
    // Errors land somewhere.
    const totalErrors = aggregated.errorsHourly.reduce((acc, b) => acc + b.count, 0);
    expect(totalErrors).toBeGreaterThan(0);
    // Token data lands somewhere.
    const totalTokens = aggregated.costWeekly.reduce((acc, b) => acc + b.tokensIn + b.tokensOut, 0);
    expect(totalTokens).toBeGreaterThan(0);
  });
});

describe("mulberry32", () => {
  it("yields the same sequence for the same seed", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    for (let i = 0; i < 10; i += 1) {
      expect(a()).toBe(b());
    }
  });

  it("yields different sequences for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
});
