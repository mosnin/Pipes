"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Loader2, ChevronRight, ChevronDown, Clock, Zap, History } from "lucide-react";
import { toast } from "sonner";

type TraceStep = { step: number; nodeId: string; summary: string; latency_ms?: number; token_count?: number };
type TraceResult = { status: "success" | "halted" | "error"; steps: TraceStep[]; totalLatencyMs: number; totalTokens: number };
type HistoryEntry = TraceResult & { runId: string; ranAt: string };

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function StatusBadge({ status }: { status: TraceResult["status"] }) {
  const cls = status === "success" ? "bg-emerald-100 text-emerald-700" : status === "halted" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return (
    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-semibold ${cls}`} style={{ fontSize: 9 }}>
      {status}
    </span>
  );
}

function StepList({ steps, maxLatency, animate = false }: { steps: TraceStep[]; maxLatency: number; animate?: boolean }) {
  return (
    <ol className="flex flex-col gap-1.5 mt-2">
      {steps.map((s, i) => (
        <motion.li
          key={s.step}
          initial={animate ? { opacity: 0, x: -4 } : false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18, delay: animate ? i * 0.05 : 0, ease: "easeOut" }}
          className="flex items-start gap-1.5"
        >
          <span className="mt-0.5 w-3.5 h-3.5 rounded-full bg-violet-100 flex items-center justify-center shrink-0 text-violet-600" style={{ fontSize: 8, fontWeight: 700 }}>
            {s.step}
          </span>
          <ChevronRight size={9} className="mt-1 shrink-0 text-[#C7C7CC]" />
          <div className="flex-1 min-w-0">
            <p className="t-caption text-[#3C3C43] leading-snug" style={{ fontSize: 11 }}>{s.summary}</p>
            {s.latency_ms !== undefined && s.latency_ms > 0 && (
              <div className="mt-0.5 flex items-center gap-1.5">
                <div className="flex-1 h-0.5 rounded-full bg-[#F2F2F7] overflow-hidden">
                  <div className="h-0.5 rounded-full bg-violet-400" style={{ width: `${Math.round((s.latency_ms / maxLatency) * 100)}%` }} />
                </div>
                <span className="shrink-0 text-[#8E8E93]" style={{ fontSize: 9 }}>{formatMs(s.latency_ms)}</span>
              </div>
            )}
          </div>
        </motion.li>
      ))}
    </ol>
  );
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const [open, setOpen] = useState(false);
  const maxLatency = Math.max(...entry.steps.map((s) => s.latency_ms ?? 0), 1);
  return (
    <div className="rounded-md border border-black/[0.06] bg-[#FAFAFA]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-[#F2F2F7] transition-colors rounded-md"
      >
        <StatusBadge status={entry.status} />
        <span className="flex-1 text-left t-caption text-[#3C3C43]" style={{ fontSize: 11 }}>
          {entry.steps.length} step{entry.steps.length !== 1 ? "s" : ""}
        </span>
        <span className="t-caption text-[#8E8E93] flex items-center gap-0.5" style={{ fontSize: 10 }}>
          <Clock size={9} />
          ~{formatMs(entry.totalLatencyMs)}
        </span>
        {entry.totalTokens > 0 && (
          <span className="t-caption text-[#8E8E93] flex items-center gap-0.5" style={{ fontSize: 10 }}>
            <Zap size={9} />
            {entry.totalTokens.toLocaleString()}
          </span>
        )}
        <span className="t-caption text-[#C7C7CC]" style={{ fontSize: 10 }}>{formatTime(entry.ranAt)}</span>
        {open ? <ChevronDown size={10} className="text-[#8E8E93]" /> : <ChevronRight size={10} className="text-[#8E8E93]" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-2.5 pb-2"
          >
            <StepList steps={entry.steps} maxLatency={maxLatency} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SimulationTelemetryCard({ systemId }: { systemId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TraceResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

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
      const data: TraceResult = json.data;
      setResult(data);
      setHistory((prev) => [
        { ...data, runId: `r${Date.now()}`, ranAt: new Date().toISOString() },
        ...prev.slice(0, 4),
      ]);
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
              <StatusBadge status={result.status} />
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
            <StepList steps={result.steps} maxLatency={maxLatency} animate />
          </motion.div>
        )}
      </AnimatePresence>

      {!result && !loading && (
        <p className="t-caption text-[#8E8E93]" style={{ fontSize: 11 }}>
          Run a trace to see per-node latency and token estimates.
        </p>
      )}

      {/* Run history */}
      {history.length > 1 && (
        <div className="mt-3 pt-3 border-t border-black/[0.06]">
          <div className="flex items-center gap-1.5 mb-2">
            <History size={10} className="text-[#8E8E93]" />
            <span className="t-overline text-[#8E8E93]" style={{ fontSize: 10 }}>Past runs</span>
          </div>
          <div className="flex flex-col gap-1">
            {history.slice(1).map((entry) => (
              <HistoryRow key={entry.runId} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
