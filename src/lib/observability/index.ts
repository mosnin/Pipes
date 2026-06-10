// Observability helpers. Pure functions; no-op when no exporter is set.
//
// All helpers are fire-and-forget. They never block or throw.
//
// Sample fan-out:
//   1. metrics-store: append to Convex `metrics_samples` (read by the
//      admin metrics dashboard).
//   2. OTEL: dispatch as histogram/counter when configured.
//   3. Sentry: dispatch errors when configured.

import { recordSample, type MetricKind } from "@/lib/observability/metrics-store";
import { getOtel } from "@/lib/observability/otel";
import { getSentry } from "@/lib/observability/sentry";

function nowIso(): string {
  return new Date().toISOString();
}

function send(kind: MetricKind, label: string, value: number, tags?: Record<string, string>): void {
  recordSample({ kind, label, value, tags, ts: nowIso() });
}

export function recordLatency(label: string, ms: number, tags?: Record<string, string>): void {
  send("latency", label, ms, tags);
  void (async () => {
    try {
      const otel = await getOtel();
      otel?.recordLatency(label, ms, tags);
    } catch {
      // observability paths must never throw
    }
  })();
}

export function recordCounter(label: string, value: number, tags?: Record<string, string>): void {
  send("counter", label, value, tags);
  void (async () => {
    try {
      const otel = await getOtel();
      otel?.recordCounter(label, value, tags);
    } catch {
      // observability paths must never throw
    }
  })();
}

export function recordError(label: string, err: unknown, tags?: Record<string, string>): void {
  // We persist the error label and a 1 value so the dashboard can count
  // errors. The full error message is sent to Sentry; the metrics row
  // intentionally does not capture PII.
  send("error", label, 1, tags);
  void (async () => {
    try {
      const sentry = await getSentry();
      sentry?.captureException(err, { extra: { label, tags } });
    } catch {
      // observability paths must never throw
    }
  })();
}

export async function startSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  let span: { end: () => void; recordException?: (err: unknown) => void } | null = null;
  try {
    const otel = await getOtel();
    span = otel ? otel.startSpan(name) : null;
  } catch {
    span = null;
  }
  try {
    const result = await fn();
    recordLatency(`${name}.latency_ms`, Date.now() - start);
    return result;
  } catch (err) {
    recordError(`${name}.error`, err);
    if (span && typeof span.recordException === "function") {
      try { span.recordException(err); } catch { /* ignore */ }
    }
    throw err;
  } finally {
    if (span) {
      try { span.end(); } catch { /* ignore */ }
    }
  }
}
