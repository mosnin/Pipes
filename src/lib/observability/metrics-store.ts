// metrics-store: append latency / counter / error samples to the in-app
// metrics table. Cheap; fire-and-forget. The admin dashboard reads from this.
//
// In mock mode the in-memory metrics repository swallows writes; in provider
// mode the Convex metrics repository persists rows in `metrics_samples`.
// Failure to persist NEVER throws.

import type { RepositorySet } from "@/lib/repositories/contracts";

export type MetricKind = "latency" | "counter" | "error";

export type MetricSample = {
  kind: MetricKind;
  label: string;
  value: number;
  tags?: Record<string, string>;
  ts: string;
};

let resolver: (() => Promise<RepositorySet | null>) | null = null;

export function configureMetricsStore(getRepos: () => Promise<RepositorySet | null>): void {
  resolver = getRepos;
}

export function recordSample(sample: MetricSample): void {
  // Fire-and-forget. The metrics path must never block the request.
  void (async () => {
    try {
      if (!resolver) return;
      const repos = await resolver();
      if (!repos || !repos.metrics) return;
      await repos.metrics.recordSample(sample);
    } catch (err) {
      // Last resort: log and move on. Never throw to caller.
      // eslint-disable-next-line no-console
      console.warn("metrics-store: recordSample failed", err);
    }
  })();
}

export function resetMetricsStoreForTests(): void {
  resolver = null;
}
