"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Loader2, ChevronRight, Clock, Zap } from "lucide-react";
import { toast } from "sonner";

type TraceStep = { step: number; nodeId: string; summary: string; latency_ms?: number; token_count?: number };
type TraceResult = { status: "success" | "halted" | "error"; steps: TraceStep[]; totalLatencyMs: number; totalTokens: number };

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

export function SimulationTelemetryCard({ systemId }: { systemId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TraceResult | null>(null);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch(`/api/systems/${systemId}/simulate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Trace failed");
      setResult(json.data);
    } catch (err) {
      toast.error("Trace failed", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  const maxLatency = result ? Math.max(...result.steps.map((s) => s.latency_ms ?? 0), 1) : 1;

  return (
    <div className="rounded-lg border border-black/[0.08] bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <h5 className="t-label font-semibold text-[#3C3C43]">Telemetry trace</h5>
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 py-1.5 t-caption font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
          style={{ fontSize: 11 }}
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
          {loading ? "Running…" : "Run trace"}
        </button>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {/* Summary */}
            <div className="flex items-center gap-3 mb-2.5 flex-wrap">
              <span
                className={[
                  "inline-flex items-center rounded-full px-1.5 py-0.5 t-overline font-semibold",
                  result.status === "success" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                ].join(" ")}
                style={{ fontSize: 9 }}
              >
                {result.status}
              </span>
              <span className="inline-flex items-center gap-1 t-caption text-[#3C3C43]" style={{ fontSize: 11 }}>
                <Clock size={10} className="text-[#8E8E93]" />
                ~{formatMs(result.totalLatencyMs)}
              </span>
              {result.totalTokens > 0 && (
                <span className="inline-flex items-center gap-1 t-caption text-[#3C3C43]" style={{ fontSize: 11 }}>
                  <Zap size={10} className="text-[#8E8E93]" />
                  ~{result.totalTokens.toLocaleString()} tok
                </span>
              )}
            </div>

            {/* Steps */}
            <ol className="flex flex-col gap-1.5">
              {result.steps.map((s) => (
                <li key={s.step} className="flex items-start gap-1.5">
                  <span
                    className="mt-0.5 w-3.5 h-3.5 rounded-full bg-violet-100 flex items-center justify-center shrink-0 text-violet-600"
                    style={{ fontSize: 8, fontWeight: 700 }}
                  >
                    {s.step}
                  </span>
                  <ChevronRight size={9} className="mt-1 shrink-0 text-[#C7C7CC]" />
                  <div className="flex-1 min-w-0">
                    <p className="t-caption text-[#3C3C43] leading-snug" style={{ fontSize: 11 }}>{s.summary}</p>
                    {s.latency_ms !== undefined && s.latency_ms > 0 && (
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <div className="flex-1 h-0.5 rounded-full bg-[#F2F2F7] overflow-hidden">
                          <div
                            className="h-0.5 rounded-full bg-violet-400"
                            style={{ width: `${Math.round((s.latency_ms / maxLatency) * 100)}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[#8E8E93]" style={{ fontSize: 9 }}>{formatMs(s.latency_ms)}</span>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>

      {!result && !loading && (
        <p className="t-caption text-[#8E8E93]" style={{ fontSize: 11 }}>
          Run a trace to see per-node latency and token estimates.
        </p>
      )}
    </div>
  );
}
