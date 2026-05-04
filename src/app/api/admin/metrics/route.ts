import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";

const DAY_MS = 24 * 60 * 60 * 1000;

function pctile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export async function GET(_request: Request) {
  try {
    const { services, identity, repositories } = await getServerApp();
    services.access.ensureInternalOperator(identity.email);

    const sinceDay = new Date(Date.now() - DAY_MS).toISOString();
    const sinceWeek = new Date(Date.now() - 7 * DAY_MS).toISOString();

    const [latency24, errors24, counters24, feedback7] = await Promise.all([
      repositories.metrics.listSamples({ kind: "latency", sinceTs: sinceDay, limit: 5000 }),
      repositories.metrics.listSamples({ kind: "error", sinceTs: sinceDay, limit: 1000 }),
      repositories.metrics.listSamples({ kind: "counter", sinceTs: sinceDay, limit: 5000 }),
      repositories.metrics.listSamples({ kind: "counter", sinceTs: sinceWeek, limit: 5000 })
    ]);

    const buildLatencies = latency24
      .filter((s) => s.label === "agent_build.duration_ms")
      .map((s) => s.value)
      .sort((a, b) => a - b);
    const requests24 = counters24.filter((s) => s.label === "agent_build.request").length;
    const errors24Count = errors24.filter((s) => s.label.startsWith("agent_build")).length;
    const errorRate24 = requests24 > 0 ? errors24Count / requests24 : 0;

    const feedbackUp7 = feedback7.filter((s) => s.label === "feedback.kind.thumbs" && s.tags?.verdict !== "down").length
      + feedback7.filter((s) => s.label === "feedback.kind.nps").length;

    // Latency timeline: bucket into 24 hourly buckets.
    const hourlyBuckets = new Array(24).fill(0).map(() => ({ count: 0, sum: 0 }));
    const sinceMs = Date.now() - DAY_MS;
    for (const s of latency24) {
      if (s.label !== "agent_build.duration_ms") continue;
      const t = new Date(s.ts).getTime();
      const offset = Math.max(0, Math.min(23, Math.floor((t - sinceMs) / (DAY_MS / 24))));
      hourlyBuckets[offset].count += 1;
      hourlyBuckets[offset].sum += s.value;
    }
    const latencyTimeline = hourlyBuckets.map((b) => (b.count > 0 ? Math.round(b.sum / b.count) : 0));

    // Build count by day (last 7 days).
    const dailyBuckets = new Array(7).fill(0);
    const weekStart = Date.now() - 7 * DAY_MS;
    const requestsCounters = feedback7.filter((s) => s.label === "agent_build.request");
    for (const s of requestsCounters) {
      const t = new Date(s.ts).getTime();
      const idx = Math.max(0, Math.min(6, Math.floor((t - weekStart) / DAY_MS)));
      dailyBuckets[idx] += 1;
    }

    // Recent errors and slowest builds.
    const recentErrors = errors24
      .slice(0, 50)
      .map((s) => ({ id: s.id, ts: s.ts, label: s.label, tags: s.tags ?? {} }));

    const slowestBuilds = latency24
      .filter((s) => s.label === "agent_build.duration_ms")
      .sort((a, b) => b.value - a.value)
      .slice(0, 50)
      .map((s) => ({ id: s.id, ts: s.ts, ms: s.value, tags: s.tags ?? {} }));

    return NextResponse.json(success({
      kpis: {
        p50: pctile(buildLatencies, 50),
        p95: pctile(buildLatencies, 95),
        errorRate24: Number(errorRate24.toFixed(4)),
        feedbackRate7: feedbackUp7
      },
      timelines: {
        latencyHourly: latencyTimeline,
        buildsDaily: dailyBuckets
      },
      recentErrors,
      slowestBuilds
    }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 403 });
  }
}
