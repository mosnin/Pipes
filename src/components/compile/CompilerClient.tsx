"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, AlertTriangle, Info, CheckCircle2, Loader2, Import, RotateCcw, Play, ExternalLink, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { importGraphAsLoop } from "@/lib/importGraph";
import { FlowGraph } from "@/components/shared/FlowGraph";
import type { CompiledGraph } from "@/lib/ai/compiler";

// ---------------------------------------------------------------------------
// Run trace panel (shown after import)
// ---------------------------------------------------------------------------

type TraceStep = { step: number; nodeId: string; summary: string; latency_ms?: number; token_count?: number };
type TraceResult = { status: "success" | "halted" | "error"; steps: TraceStep[]; totalLatencyMs: number; totalTokens: number };

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function LoopReadyPanel({ systemId, systemName, onClear }: { systemId: string; systemName: string; onClear: () => void }) {
  const [tracing, setTracing] = useState(false);
  const [trace, setTrace] = useState<TraceResult | null>(null);

  async function runTrace() {
    setTracing(true);
    setTrace(null);
    try {
      const res = await fetch(`/api/systems/${systemId}/simulate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Trace failed");
      setTrace(json.data);
    } catch (err) {
      toast.error("Trace failed", { description: (err as Error).message });
    } finally {
      setTracing(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6"
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="t-label font-semibold text-emerald-800">Loop created</span>
          </div>
          <p className="t-caption text-emerald-700" style={{ fontSize: 12 }}>
            <span className="font-semibold">{systemName}</span> is ready in your workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="t-caption text-emerald-600 hover:text-emerald-800 transition-colors"
          style={{ fontSize: 11 }}
        >
          Dismiss
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          onClick={runTrace}
          disabled={tracing}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 t-label font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
        >
          {tracing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          Run dry-run trace
        </button>
        <a
          href={`/systems/${systemId}`}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-5 py-2.5 t-label font-semibold text-emerald-700 hover:border-emerald-400 hover:text-emerald-800 transition-colors"
        >
          <ExternalLink size={13} />
          Open in editor
        </a>
      </div>

      {/* Trace results */}
      <AnimatePresence>
        {trace && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="border-t border-emerald-200 pt-4">
              {/* Telemetry summary */}
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <span
                  className={[
                    "inline-flex items-center rounded-full px-2 py-0.5 t-caption font-semibold",
                    trace.status === "success" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                  ].join(" ")}
                  style={{ fontSize: 10 }}
                >
                  {trace.status === "success" ? "Trace complete" : "Halted"}
                </span>
                <span className="t-caption text-emerald-700 font-semibold" style={{ fontSize: 11 }}>
                  ~{formatMs(trace.totalLatencyMs)} estimated
                </span>
                {trace.totalTokens > 0 && (
                  <span className="t-caption text-emerald-600" style={{ fontSize: 11 }}>
                    ~{trace.totalTokens.toLocaleString()} tokens
                  </span>
                )}
                <span className="t-caption text-emerald-500" style={{ fontSize: 11 }}>
                  {trace.steps.length} step{trace.steps.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Max latency for proportional bars */}
              {(() => {
                const maxLatency = Math.max(...trace.steps.map((s) => s.latency_ms ?? 0), 1);
                return (
                  <ol className="flex flex-col gap-2">
                    {trace.steps.map((s) => (
                      <li key={s.step} className="flex items-start gap-2.5">
                        <span
                          className="mt-0.5 w-4 h-4 rounded-full bg-emerald-200 flex items-center justify-center shrink-0 t-overline text-emerald-700"
                          style={{ fontSize: 9, fontWeight: 700 }}
                        >
                          {s.step}
                        </span>
                        <ChevronRight size={11} className="mt-1 shrink-0 text-emerald-400" />
                        <div className="flex-1 min-w-0">
                          <p className="t-caption text-emerald-800" style={{ fontSize: 12 }}>{s.summary}</p>
                          {s.latency_ms !== undefined && s.latency_ms > 0 && (
                            <div className="mt-1 flex items-center gap-2">
                              <div className="flex-1 h-1 rounded-full bg-emerald-100 overflow-hidden">
                                <div
                                  className="h-1 rounded-full bg-emerald-400"
                                  style={{ width: `${Math.round((s.latency_ms / maxLatency) * 100)}%` }}
                                />
                              </div>
                              <span className="shrink-0 t-overline text-emerald-500" style={{ fontSize: 9 }}>
                                {formatMs(s.latency_ms)}
                              </span>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Result panel
// ---------------------------------------------------------------------------

function GraphPreview({ graph, onClear }: { graph: CompiledGraph; onClear: () => void }) {
  const [importing, setImporting] = useState(false);
  const [importedId, setImportedId] = useState<string | null>(null);

  async function handleImport() {
    setImporting(true);
    const id = await importGraphAsLoop(graph);
    setImporting(false);
    if (id) setImportedId(id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      className="mt-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={15} className="text-emerald-500" />
            <span className="t-overline text-[#8E8E93]">Compiled successfully</span>
          </div>
          <h2 className="t-h3 text-[#111]">{graph.systemName}</h2>
          {graph.description && (
            <p className="mt-1 t-caption text-[#3C3C43]" style={{ fontSize: 12, maxWidth: "64ch" }}>
              {graph.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-2 rounded-xl border border-black/[0.1] bg-white px-4 py-2.5 t-label font-semibold text-[#3C3C43] hover:border-black/[0.2] hover:text-[#111] transition-colors"
          >
            <RotateCcw size={13} />
            Clear
          </button>
          {!importedId && (
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 t-label font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Import size={14} />}
              Import as Loop
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-6 mb-4">
        <div>
          <p className="t-overline text-[#8E8E93]">Nodes</p>
          <p className="t-label font-semibold text-[#111]">{graph.nodes.length}</p>
        </div>
        <div>
          <p className="t-overline text-[#8E8E93]">Connections</p>
          <p className="t-label font-semibold text-[#111]">{graph.pipes.length}</p>
        </div>
        {graph.assumptions.length > 0 && (
          <div>
            <p className="t-overline text-[#8E8E93]">Assumptions</p>
            <p className="t-label font-semibold text-[#111]">{graph.assumptions.length}</p>
          </div>
        )}
      </div>

      {/* The actual graph */}
      <FlowGraph nodes={graph.nodes} pipes={graph.pipes} />

      {/* Assumptions + Warnings */}
      {(graph.assumptions.length > 0 || graph.warnings.length > 0) && (
        <div className="mt-4 flex flex-col gap-2">
          {graph.assumptions.map((a, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg border border-black/[0.06] bg-[#FAFAFA] px-3.5 py-2.5">
              <Info size={13} className="text-[#8E8E93] mt-0.5 shrink-0" />
              <p className="t-caption text-[#3C3C43]" style={{ fontSize: 12 }}>{a}</p>
            </div>
          ))}
          {graph.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5">
              <AlertTriangle size={13} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="t-caption text-amber-800" style={{ fontSize: 12 }}>{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Loop ready / run trace */}
      {importedId && (
        <LoopReadyPanel
          systemId={importedId}
          systemName={graph.systemName}
          onClear={onClear}
        />
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function CompilerClient() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompiledGraph | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  async function handleCompile() {
    if (!content.trim()) {
      toast.error("Paste your document first");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Compilation failed");
      setResult(json.data);
    } catch (err) {
      toast.error("Compilation failed", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="t-label font-semibold text-[#111]">Paste your document</label>
        <span
          className="t-caption tabular-nums"
          style={{ fontSize: 11, color: content.length > 18000 ? "#EF4444" : "#8E8E93" }}
        >
          {content.length.toLocaleString()} / 20,000
        </span>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`Paste a SOP, API spec, README, book excerpt, or any structured process.\n\nLooper auto-detects the document type and compiles it into an executable agent loop.`}
        maxLength={20000}
        className="w-full h-72 resize-none rounded-xl border border-black/[0.1] bg-white px-4 py-3.5 t-body text-[#111] text-[13px] leading-relaxed placeholder:text-[#8E8E93] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors font-mono"
        spellCheck={false}
      />
      <div className="flex items-center justify-between">
        <p className="t-caption text-[#8E8E93]" style={{ fontSize: 11 }}>
          SOP, API spec, docs, or book — Looper figures out the rest.
        </p>
        <button
          onClick={handleCompile}
          disabled={loading || !content.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 t-label font-semibold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Compiling...
            </>
          ) : (
            <>
              <Sparkles size={15} />
              Compile to Loop
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>

      {/* Result */}
      <div ref={resultRef}>
        <AnimatePresence>
          {result && <GraphPreview graph={result} onClear={() => setResult(null)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
