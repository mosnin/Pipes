// metrics-aggregation: pure functions that bucket raw metric samples into
// time-series suitable for the admin metrics dashboard charts. Lives outside
// the repository implementations so both mock and Convex paths share the
// same math, and so the bucketing logic is unit-testable in isolation.

import type { MetricsSampleRecord } from "@/lib/repositories/contracts";

export type LatencyBucket = { ts: string; p50: number; p95: number };
export type CountBucket = { date: string; count: number };
export type HourlyCountBucket = { ts: string; count: number };
export type CostBucket = { date: string; tokensIn: number; tokensOut: number };

export type AggregatedMetrics = {
  latencyHourly: LatencyBucket[];
  buildsDaily: CountBucket[];
  errorsHourly: HourlyCountBucket[];
  costWeekly: CostBucket[];
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Returns the floor-of-hour ISO timestamp for the given epoch ms.
 */
function floorHourIso(epochMs: number): string {
  return new Date(Math.floor(epochMs / HOUR_MS) * HOUR_MS).toISOString();
}

/**
 * Returns the YYYY-MM-DD date string (UTC) for the given epoch ms.
 */
function floorDayIso(epochMs: number): string {
  const d = new Date(Math.floor(epochMs / DAY_MS) * DAY_MS);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the value at the p-th percentile (0..100) of a sorted-ascending array.
 * Uses nearest-rank. Returns 0 if the array is empty.
 */
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const clamped = Math.max(0, Math.min(100, p));
  const idx = Math.min(sortedAsc.length - 1, Math.floor((clamped / 100) * sortedAsc.length));
  return sortedAsc[idx];
}

/**
 * Buckets latency samples into `hours` hourly buckets ending at `nowMs`.
 * Within each bucket, computes p50 and p95 over the `value` field.
 * Empty buckets emit zero values.
 */
export function aggregateLatencyHourly(
  samples: MetricsSampleRecord[],
  nowMs: number,
  hours: number,
  label = "agent_build.duration_ms"
): LatencyBucket[] {
  // Anchor the last bucket on the hour containing `nowMs`, then extend
  // backwards `hours-1` hours so that a sample taken at `nowMs` itself
  // lands inside the visible window rather than spilling past it.
  const nowHour = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
  const bucketStart = nowHour - (hours - 1) * HOUR_MS;
  const buckets: number[][] = Array.from({ length: hours }, () => []);
  for (const s of samples) {
    if (s.label !== label) continue;
    const t = new Date(s.ts).getTime();
    if (Number.isNaN(t)) continue;
    const offset = Math.floor((t - bucketStart) / HOUR_MS);
    if (offset < 0 || offset >= hours) continue;
    buckets[offset].push(s.value);
  }
  return buckets.map((values, idx) => {
    const sorted = values.slice().sort((a, b) => a - b);
    return {
      ts: new Date(bucketStart + idx * HOUR_MS).toISOString(),
      p50: Math.round(percentile(sorted, 50)),
      p95: Math.round(percentile(sorted, 95))
    };
  });
}

/**
 * Buckets counter samples by day. Returns `days` daily buckets ending at `nowMs`.
 */
export function aggregateBuildsDaily(
  samples: MetricsSampleRecord[],
  nowMs: number,
  days: number,
  label = "agent_build.request"
): CountBucket[] {
  const nowDay = Math.floor(nowMs / DAY_MS) * DAY_MS;
  const startDayMs = nowDay - (days - 1) * DAY_MS;
  const buckets = new Array(days).fill(0) as number[];
  for (const s of samples) {
    if (s.label !== label) continue;
    const t = new Date(s.ts).getTime();
    if (Number.isNaN(t)) continue;
    const offset = Math.floor((t - startDayMs) / DAY_MS);
    if (offset < 0 || offset >= days) continue;
    buckets[offset] += 1;
  }
  return buckets.map((count, idx) => ({
    date: floorDayIso(startDayMs + idx * DAY_MS),
    count
  }));
}

/**
 * Buckets error samples per hour for the last `hours` hours.
 */
export function aggregateErrorsHourly(
  samples: MetricsSampleRecord[],
  nowMs: number,
  hours: number
): HourlyCountBucket[] {
  const nowHour = Math.floor(nowMs / HOUR_MS) * HOUR_MS;
  const bucketStart = nowHour - (hours - 1) * HOUR_MS;
  const buckets = new Array(hours).fill(0) as number[];
  for (const s of samples) {
    if (s.kind !== "error") continue;
    const t = new Date(s.ts).getTime();
    if (Number.isNaN(t)) continue;
    const offset = Math.floor((t - bucketStart) / HOUR_MS);
    if (offset < 0 || offset >= hours) continue;
    buckets[offset] += 1;
  }
  return buckets.map((count, idx) => ({
    ts: new Date(bucketStart + idx * HOUR_MS).toISOString(),
    count
  }));
}

/**
 * Buckets token-cost samples per day. Expects samples with labels:
 *   - "agent_build.tokens_in"  (kind=counter)
 *   - "agent_build.tokens_out" (kind=counter)
 * Returns `days` daily buckets ending at `nowMs`.
 */
export function aggregateCostDaily(
  samples: MetricsSampleRecord[],
  nowMs: number,
  days: number
): CostBucket[] {
  const nowDay = Math.floor(nowMs / DAY_MS) * DAY_MS;
  const startDayMs = nowDay - (days - 1) * DAY_MS;
  const tokensIn = new Array(days).fill(0) as number[];
  const tokensOut = new Array(days).fill(0) as number[];
  for (const s of samples) {
    const t = new Date(s.ts).getTime();
    if (Number.isNaN(t)) continue;
    const offset = Math.floor((t - startDayMs) / DAY_MS);
    if (offset < 0 || offset >= days) continue;
    if (s.label === "agent_build.tokens_in") tokensIn[offset] += s.value;
    else if (s.label === "agent_build.tokens_out") tokensOut[offset] += s.value;
  }
  return tokensIn.map((tin, idx) => ({
    date: floorDayIso(startDayMs + idx * DAY_MS),
    tokensIn: Math.round(tin),
    tokensOut: Math.round(tokensOut[idx])
  }));
}

/**
 * Aggregates a flat sample list into the four series the dashboard renders.
 */
export function aggregateAll(
  samples: MetricsSampleRecord[],
  nowMs: number,
  opts?: { latencyHours?: number; buildDays?: number; errorHours?: number; costDays?: number }
): AggregatedMetrics {
  const latencyHours = opts?.latencyHours ?? 24;
  const buildDays = opts?.buildDays ?? 14;
  const errorHours = opts?.errorHours ?? 24;
  const costDays = opts?.costDays ?? 7;
  return {
    latencyHourly: aggregateLatencyHourly(samples, nowMs, latencyHours),
    buildsDaily: aggregateBuildsDaily(samples, nowMs, buildDays),
    errorsHourly: aggregateErrorsHourly(samples, nowMs, errorHours),
    costWeekly: aggregateCostDaily(samples, nowMs, costDays)
  };
}

/**
 * Deterministic 32-bit hash PRNG. Used to seed mock metric samples
 * reproducibly across calls and tests.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates ~500 realistic mock samples spanning the last 24 hours for
 * latency, plus a smattering of errors and per-day build counters across
 * the last 14 days, plus token counters for the last 7 days. Deterministic.
 */
export function seedMockSamples(nowMs: number, seed = 12345): Array<Omit<MetricsSampleRecord, "id">> {
  const rng = mulberry32(seed);
  const out: Array<Omit<MetricsSampleRecord, "id">> = [];

  // ~500 latency samples spread uniformly across last 24 hours.
  // p50 around 600ms, p95 around 1200ms, occasional spike.
  const latencyCount = 500;
  for (let i = 0; i < latencyCount; i += 1) {
    const offset = rng() * 24 * HOUR_MS;
    const ts = new Date(nowMs - offset).toISOString();
    // Base around 600, log-normal-ish tail.
    let value = 350 + rng() * 350; // 350..700
    if (rng() < 0.1) value += 400 + rng() * 600; // p95-ish
    if (rng() < 0.01) value += 1500 + rng() * 1500; // spike
    out.push({ kind: "latency", label: "agent_build.duration_ms", value: Math.round(value), ts });
  }

  // 80 build request counters over 14 days, weighted towards recent days.
  const buildCount = 80;
  for (let i = 0; i < buildCount; i += 1) {
    const dayOffset = Math.floor(rng() * 14);
    const within = rng() * DAY_MS;
    const ts = new Date(nowMs - dayOffset * DAY_MS - within).toISOString();
    out.push({ kind: "counter", label: "agent_build.request", value: 1, ts });
  }

  // ~20 errors over 24h.
  const errCount = 20;
  for (let i = 0; i < errCount; i += 1) {
    const offset = rng() * 24 * HOUR_MS;
    const ts = new Date(nowMs - offset).toISOString();
    out.push({ kind: "error", label: "agent_build.error", value: 1, tags: { reason: "timeout" }, ts });
  }

  // Token counters over the last 7 days, ~3 per day, bursty values.
  for (let day = 0; day < 7; day += 1) {
    const samplesThisDay = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < samplesThisDay; i += 1) {
      const within = rng() * DAY_MS;
      const ts = new Date(nowMs - day * DAY_MS - within).toISOString();
      out.push({ kind: "counter", label: "agent_build.tokens_in", value: Math.round(1500 + rng() * 4500), ts });
      out.push({ kind: "counter", label: "agent_build.tokens_out", value: Math.round(400 + rng() * 1500), ts });
    }
  }

  return out;
}
