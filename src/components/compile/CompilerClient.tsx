"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, AlertTriangle, Info, CheckCircle2, Loader2, Import, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { importGraphAsLoop } from "@/lib/importGraph";
import { FlowGraph } from "@/components/shared/FlowGraph";
import type { CompiledGraph } from "@/lib/ai/compiler";

// ---------------------------------------------------------------------------
// Result panel
// ---------------------------------------------------------------------------

function GraphPreview({ graph, onClear }: { graph: CompiledGraph; onClear: () => void }) {
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    setImporting(true);
    await importGraphAsLoop(graph);
    setImporting(false);
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
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 t-label font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Import size={14} />}
            Import as Loop
          </button>
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
