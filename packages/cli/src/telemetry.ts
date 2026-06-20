import { trace, context, SpanStatusCode, type Tracer } from "@opentelemetry/api";

let _tracer: Tracer | null = null;

export function initTelemetry(): void {
  const endpoint = process.env["OTEL_EXPORTER_OTLP_ENDPOINT"];
  if (!endpoint) return;

  // Dynamic import to avoid loading heavy SDK when telemetry is disabled
  void (async () => {
    const { NodeTracerProvider, BatchSpanProcessor } = await import("@opentelemetry/sdk-trace-node");
    const { OTLPTraceExporter } = await import("@opentelemetry/exporter-trace-otlp-http");
    const { resourceFromAttributes } = await import("@opentelemetry/resources");

    const provider = new NodeTracerProvider({
      resource: resourceFromAttributes({
        "service.name": "@looper/cli",
        "service.version": "0.1.0",
      }),
      spanProcessors: [
        new BatchSpanProcessor(new OTLPTraceExporter({ url: `${endpoint}/v1/traces` })),
      ],
    });

    provider.register();
    _tracer = trace.getTracer("@looper/cli", "0.1.0");
  })();
}

export async function withSpan<T>(
  name: string,
  attrs: Record<string, string | number | boolean>,
  fn: () => Promise<T>
): Promise<T> {
  if (!_tracer) return fn();

  const span = _tracer.startSpan(name, { attributes: attrs });
  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      span.end();
    }
  });
}
