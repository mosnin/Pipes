// OpenTelemetry adapter. Lazy-imports only when OTEL_EXPORTER_OTLP_ENDPOINT
// is set. Mock mode and tests do not pull the OTEL SDK.

type Span = { end: () => void; recordException?: (err: unknown) => void };

type OtelClient = {
  startSpan: (name: string) => Span;
  recordLatency: (label: string, ms: number, tags?: Record<string, string>) => void;
  recordCounter: (label: string, value: number, tags?: Record<string, string>) => void;
};

let cached: OtelClient | null | undefined;
let loading: Promise<OtelClient | null> | null = null;

async function loadOtel(): Promise<OtelClient | null> {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) return null;
  try {
    // We avoid a static module identifier so TypeScript does not require the
    // declaration to be resolvable at typecheck time. The package is only
    // loaded at runtime when OTEL_EXPORTER_OTLP_ENDPOINT is set.
    const moduleName = "@opentelemetry/api";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await (Function("name", "return import(name)") as (name: string) => Promise<unknown>)(moduleName).catch(() => null);
    if (!mod) return null;
    const tracer = typeof mod.trace?.getTracer === "function" ? mod.trace.getTracer("pipes") : null;
    const meter = typeof mod.metrics?.getMeter === "function" ? mod.metrics.getMeter("pipes") : null;
    const histograms = new Map<string, unknown>();
    const counters = new Map<string, unknown>();
    return {
      startSpan: (name: string): Span => {
        if (!tracer || typeof tracer.startSpan !== "function") {
          return { end: () => undefined };
        }
        try {
          const span = tracer.startSpan(name);
          return {
            end: () => {
              try { span.end(); } catch { /* ignore */ }
            },
            recordException: (err: unknown) => {
              try {
                if (typeof span.recordException === "function") span.recordException(err as Error);
              } catch { /* ignore */ }
            }
          };
        } catch {
          return { end: () => undefined };
        }
      },
      recordLatency: (label: string, ms: number, tags?: Record<string, string>) => {
        if (!meter) return;
        try {
          let h = histograms.get(label);
          if (!h && typeof meter.createHistogram === "function") {
            h = meter.createHistogram(label);
            histograms.set(label, h);
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (h && typeof (h as any).record === "function") (h as any).record(ms, tags ?? {});
        } catch { /* ignore */ }
      },
      recordCounter: (label: string, value: number, tags?: Record<string, string>) => {
        if (!meter) return;
        try {
          let c = counters.get(label);
          if (!c && typeof meter.createCounter === "function") {
            c = meter.createCounter(label);
            counters.set(label, c);
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (c && typeof (c as any).add === "function") (c as any).add(value, tags ?? {});
        } catch { /* ignore */ }
      }
    };
  } catch {
    return null;
  }
}

export async function getOtel(): Promise<OtelClient | null> {
  if (cached !== undefined) return cached;
  if (!loading) loading = loadOtel();
  cached = await loading;
  return cached;
}

export function resetOtelForTests(): void {
  cached = undefined;
  loading = null;
}

export function isOtelConfigured(): boolean {
  return Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
}
