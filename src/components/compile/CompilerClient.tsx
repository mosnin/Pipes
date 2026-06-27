"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, AlertTriangle, Info, CheckCircle2, Loader2, Import, RotateCcw, Play, ExternalLink, ChevronRight, ClipboardCopy, ClipboardCheck, Download } from "lucide-react";
import { toast } from "sonner";
import { importGraphAsLoop } from "@/lib/importGraph";
import { FlowGraph } from "@/components/shared/FlowGraph";
import type { CompiledGraph } from "@/lib/ai/compiler";

// ---------------------------------------------------------------------------
// Run trace panel (shown after import)
// ---------------------------------------------------------------------------

type TraceStep = { step: number; nodeId: string; summary: string; latency_ms?: number; token_count?: number };
type TraceResult = { status: "success" | "halted" | "error"; steps: TraceStep[]; totalLatencyMs: number; totalTokens: number; message?: string };

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function LoopReadyPanel({ systemId, systemName, onClear }: { systemId: string; systemName: string; onClear: () => void }) {
  const [tracing, setTracing] = useState(false);
  const [trace, setTrace] = useState<TraceResult | null>(null);
  const [branch, setBranch] = useState<"primary" | "secondary">("primary");

  async function runTrace(b: "primary" | "secondary" = branch) {
    setTracing(true);
    setTrace(null);
    try {
      const res = await fetch(`/api/systems/${systemId}/simulate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(b === "secondary" ? { input: { decision: "secondary" } } : {}),
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

  function switchBranch(b: "primary" | "secondary") {
    setBranch(b);
    if (trace) runTrace(b);
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

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          type="button"
          onClick={() => runTrace()}
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
      {/* Branch toggle — only shown after first trace */}
      {(trace || tracing) && (
        <div className="flex items-center gap-1.5 mb-4">
          <span className="t-caption text-emerald-700 mr-1" style={{ fontSize: 11 }}>Branch:</span>
          {(["primary", "secondary"] as const).map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => switchBranch(b)}
              disabled={tracing}
              className="t-caption rounded-lg px-2.5 py-1 font-semibold transition-colors disabled:opacity-50"
              style={{
                fontSize: 11,
                background: branch === b ? "#059669" : "white",
                color: branch === b ? "white" : "#047857",
                border: `1px solid ${branch === b ? "#059669" : "#A7F3D0"}`,
              }}
            >
              {b === "primary" ? "Primary" : "Secondary"}
            </button>
          ))}
        </div>
      )}

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
                  <>
                    <span className="t-caption text-emerald-600" style={{ fontSize: 11 }}>
                      ~{trace.totalTokens.toLocaleString()} tokens
                    </span>
                    <span className="t-caption text-emerald-500" style={{ fontSize: 11 }}>
                      ~${(trace.totalTokens * 0.00000015).toFixed(4)}/run
                    </span>
                  </>
                )}
                <span className="t-caption text-emerald-500" style={{ fontSize: 11 }}>
                  {trace.steps.length} step{trace.steps.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Steps or empty-graph message */}
              {trace.steps.length === 0 ? (
                <p className="t-caption text-amber-700" style={{ fontSize: 11 }}>
                  {trace.message ?? "No nodes were traced."}
                </p>
              ) : (() => {
                const maxLatency = Math.max(...trace.steps.map((s) => s.latency_ms ?? 0), 1);
                return (
                  <ol className="flex flex-col gap-2">
                    {trace.steps.map((s, i) => (
                      <motion.li
                        key={s.step}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.22, delay: i * 0.06, ease: "easeOut" }}
                        className="flex items-start gap-2.5"
                      >
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
                      </motion.li>
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
// Collapsible assumptions list
// ---------------------------------------------------------------------------

function AssumptionsList({ assumptions }: { assumptions: string[] }) {
  const [expanded, setExpanded] = useState(false);
  if (assumptions.length === 0) return null;
  const visible = expanded ? assumptions : assumptions.slice(0, 2);
  const hidden = assumptions.length - 2;
  return (
    <div className="mt-4 flex flex-col gap-1.5">
      {visible.map((a, i) => (
        <div key={i} className="flex items-start gap-2.5 rounded-lg border border-black/[0.06] bg-[#FAFAFA] px-3.5 py-2.5">
          <Info size={13} className="text-[#8E8E93] mt-0.5 shrink-0" />
          <p className="t-caption text-[#3C3C43]" style={{ fontSize: 12 }}>{a}</p>
        </div>
      ))}
      {hidden > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="self-start t-caption text-[#8E8E93] hover:text-[#3C3C43] transition-colors"
          style={{ fontSize: 11 }}
        >
          + {hidden} more assumption{hidden !== 1 ? "s" : ""}
        </button>
      )}
      {expanded && assumptions.length > 2 && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="self-start t-caption text-[#8E8E93] hover:text-[#3C3C43] transition-colors"
          style={{ fontSize: 11 }}
        >
          Show less
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result panel
// ---------------------------------------------------------------------------

function GraphPreview({ graph, onClear }: { graph: CompiledGraph; onClear: () => void }) {
  const [importing, setImporting] = useState(false);
  const [importedId, setImportedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(JSON.stringify(graph, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${graph.systemName.toLowerCase().replace(/\s+/g, "-")}.looper.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  }

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
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-xl border border-black/[0.1] bg-white px-4 py-2.5 t-label font-semibold text-[#3C3C43] hover:border-black/[0.2] hover:text-[#111] transition-colors"
          >
            <Download size={13} />
            Download
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-xl border border-black/[0.1] bg-white px-4 py-2.5 t-label font-semibold text-[#3C3C43] hover:border-black/[0.2] hover:text-[#111] transition-colors"
          >
            {copied ? <ClipboardCheck size={13} className="text-emerald-500" /> : <ClipboardCopy size={13} />}
            {copied ? "Copied!" : "Copy JSON"}
          </button>
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
      {(() => {
        const n = graph.nodes.length;
        const aiTypes = new Set(["Agent", "Model", "Prompt", "Evaluator", "Guardrail"]);
        const humanTypes = new Set(["HumanApproval", "HumanReview"]);
        const aiCount = graph.nodes.filter((nd) => aiTypes.has(nd.type)).length;
        const humanCount = graph.nodes.filter((nd) => humanTypes.has(nd.type)).length;
        const loops = graph.nodes.filter((nd) => nd.type === "Loop" || nd.type === "SubLoop").length;
        const score = n + aiCount * 2 + humanCount * 1.5 + loops * 3;
        const [label, color, bg] =
          score >= 20 ? ["Enterprise-grade", "#7C3AED", "#F5F3FF"] :
          score >= 12 ? ["Complex", "#D97706", "#FFFBEB"] :
          score >= 6  ? ["Moderate", "#2563EB", "#EFF6FF"] :
                        ["Simple", "#16A34A", "#F0FDF4"];
        return (
          <div className="flex items-center gap-5 mb-4 flex-wrap">
            <div>
              <p className="t-overline text-[#8E8E93]">Nodes</p>
              <p className="t-label font-semibold text-[#111]">{n}</p>
            </div>
            <div>
              <p className="t-overline text-[#8E8E93]">Pipes</p>
              <p className="t-label font-semibold text-[#111]">{graph.pipes.length}</p>
            </div>
            {aiCount > 0 && (
              <div>
                <p className="t-overline text-[#8E8E93]">AI nodes</p>
                <p className="t-label font-semibold" style={{ color: "#7C3AED" }}>{aiCount}</p>
              </div>
            )}
            {humanCount > 0 && (
              <div>
                <p className="t-overline text-[#8E8E93]">Human steps</p>
                <p className="t-label font-semibold" style={{ color: "#EC4899" }}>{humanCount}</p>
              </div>
            )}
            <div className="ml-auto">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-1 t-caption font-semibold"
                style={{ fontSize: 11, color, background: bg }}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })()}

      {/* The actual graph */}
      <FlowGraph nodes={graph.nodes} pipes={graph.pipes} />

      {/* Warnings always shown */}
      {graph.warnings.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {graph.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5">
              <AlertTriangle size={13} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="t-caption text-amber-800" style={{ fontSize: 12 }}>{w}</p>
            </div>
          ))}
        </div>
      )}
      {/* Assumptions — collapsed beyond 2 */}
      <AssumptionsList assumptions={graph.assumptions} />

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
// Example snippets
// ---------------------------------------------------------------------------

const EXAMPLES: { label: string; tag: string; content: string }[] = [
  {
    label: "Support escalation SOP",
    tag: "SOP",
    content: `Customer Support Escalation SOP

Purpose: Handle inbound support tickets from receipt to resolution.

Steps:
1. Receive ticket via email or chat widget. Auto-tag with category (billing, technical, general).
2. Classify severity:
   - P1 (Critical): service down, data loss → skip queue, page on-call engineer immediately
   - P2 (High): major feature broken → assign to senior agent, SLA 4 hours
   - P3 (Medium): degraded performance → standard queue, SLA 24 hours
   - P4 (Low): general question → self-serve or 48-hour queue
3. Agent drafts initial response using knowledge base lookup.
4. If response requires account changes: human review required before sending.
5. Send response. If no reply from customer in 48 hours, mark resolved.
6. Log resolution category and root cause in CRM.
7. Weekly: aggregate root causes, flag patterns to engineering backlog.`,
  },
  {
    label: "Payments API spec",
    tag: "API",
    content: `Payments Service API — v2

Authentication: Bearer token, header: Authorization: Bearer <token>

Endpoints:

POST /v2/payments/intents
  Creates a payment intent before charging.
  Body: { amount: number (cents), currency: "usd"|"eur", customer_id: string, metadata?: object }
  Returns: { intent_id, client_secret, status: "requires_payment_method" }

POST /v2/payments/confirm
  Confirms and captures a payment intent.
  Body: { intent_id: string, payment_method_id: string }
  Returns: { charge_id, status: "succeeded"|"failed"|"requires_action", receipt_url }

GET /v2/payments/{charge_id}
  Retrieves charge details and current status.
  Returns: { charge_id, amount, currency, status, created_at, customer_id }

POST /v2/refunds
  Issues a full or partial refund.
  Body: { charge_id: string, amount?: number (omit for full refund) }
  Returns: { refund_id, amount, status: "pending"|"succeeded" }

Webhooks: payment.succeeded, payment.failed, refund.processed → POST to your registered URL`,
  },
  {
    label: "RAG pipeline docs",
    tag: "Docs",
    content: `Retrieval-Augmented Generation (RAG) Pipeline

Overview: Our RAG system answers user questions by grounding LLM responses in verified internal documents. It has three stages: retrieval, augmentation, and generation.

Retrieval Stage:
- User query is embedded using text-embedding-3-small (1536 dims).
- Approximate nearest-neighbor search runs against Pinecone index (top-k=8).
- Results are re-ranked by cross-encoder model; bottom 3 dropped.
- If similarity score < 0.72: classify as "out of scope" and return fallback.

Augmentation Stage:
- Top 5 chunks injected into system prompt as [CONTEXT] blocks.
- Each chunk includes: source document title, page/section, confidence score.
- Query + context assembled into final prompt (max 6000 tokens).

Generation Stage:
- GPT-4.1-mini called with temperature 0.2 for factual grounding.
- Output parsed for citations; missing citations trigger a retry (max 2).
- Response streamed to user with source links appended.
- Full interaction logged to audit store with chunk IDs for traceability.`,
  },
  {
    label: "Getting Things Done",
    tag: "Framework",
    content: `Getting Things Done (GTD) — David Allen

Core principle: Your mind is for having ideas, not holding them. Capture everything, then process it on a schedule.

The five stages:

1. Capture
   Collect every open loop — tasks, ideas, commitments — into a single trusted inbox (physical or digital). Nothing should live only in your head.

2. Clarify
   Process each item: Is it actionable? If no: trash it, incubate it (someday/maybe list), or file it as reference. If yes: what is the very next physical action?

3. Organize
   Place items in the right list: Next Actions (by context: @computer, @phone, @errands), Projects (anything requiring 2+ steps), Waiting For (delegated items), Calendar (date-specific), Someday/Maybe.

4. Reflect
   Weekly review: scan all lists, clear inbox to zero, update projects, identify next actions for the week ahead. Daily: check calendar and Next Actions list each morning.

5. Engage
   Choose your next action based on context, time available, energy level, and priority. Trust the system — act without second-guessing.

Key concept: Projects need a defined outcome and at least one next action or they stall.`,
  },
];

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
        {(() => {
          const MAX = 20000;
          const pct = Math.min(content.length / MAX, 1);
          const R = 8; const C = 2 * Math.PI * R;
          const warn = content.length > 18000;
          const color = warn ? "#EF4444" : content.length > 0 ? "#7C3AED" : "#C7C7CC";
          return (
            <span className="inline-flex items-center gap-1.5">
              <svg width={20} height={20} viewBox="0 0 20 20">
                <circle cx={10} cy={10} r={R} fill="none" stroke="#E5E5EA" strokeWidth={2.5} />
                <circle
                  cx={10} cy={10} r={R} fill="none"
                  stroke={color} strokeWidth={2.5}
                  strokeDasharray={`${pct * C} ${C}`}
                  strokeLinecap="round"
                  transform="rotate(-90 10 10)"
                  style={{ transition: "stroke-dasharray 0.15s ease, stroke 0.2s" }}
                />
              </svg>
              <span className="t-caption tabular-nums" style={{ fontSize: 11, color: warn ? "#EF4444" : "#8E8E93" }}>
                {content.length.toLocaleString()}
              </span>
            </span>
          );
        })()}
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && content.trim() && !loading) {
            e.preventDefault();
            handleCompile();
          }
        }}
        placeholder={`Paste a SOP, API spec, README, book excerpt, or any structured process.\n\nLooper auto-detects the document type and compiles it into an executable agent loop.`}
        maxLength={20000}
        className="w-full h-72 resize-none rounded-xl border border-black/[0.1] bg-white px-4 py-3.5 t-body text-[#111] text-[13px] leading-relaxed placeholder:text-[#8E8E93] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors font-mono"
        spellCheck={false}
      />
      {/* Example chips — shown only when the textarea is empty */}
      {!content && !result && (
        <div>
          <p className="t-overline text-[#8E8E93] mb-2" style={{ fontSize: 10 }}>Try an example</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => setContent(ex.content)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.07] bg-white px-3 py-1.5 t-caption text-[#3C3C43] hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                style={{ fontSize: 11 }}
              >
                <span className="rounded-full bg-violet-100 text-violet-600 px-1.5 py-0.5 font-semibold" style={{ fontSize: 9 }}>{ex.tag}</span>
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="t-caption text-[#8E8E93]" style={{ fontSize: 11 }}>
          SOP, API spec, docs, or book — Looper figures out the rest. <kbd className="rounded border border-black/[0.12] bg-[#F5F5F7] px-1 py-0.5 font-mono text-[#3C3C43]" style={{ fontSize: 10 }}>⌘↵</kbd> to compile.
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
          {loading && !result && (
            <motion.div
              key="compile-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-4 rounded-full bg-emerald-200 animate-pulse shrink-0" />
                <div className="w-36 h-3 rounded-full bg-[#F2F2F7] animate-pulse" />
              </div>
              <div className="w-56 h-6 rounded-full bg-[#F2F2F7] animate-pulse mb-6" />
              <div className="rounded-xl border border-black/[0.07] bg-[#F9F9FB] flex items-center justify-center" style={{ minHeight: 180 }}>
                <p className="t-caption text-[#C7C7CC]" style={{ fontSize: 12 }}>Compiling to loop graph…</p>
              </div>
            </motion.div>
          )}
          {result && <GraphPreview graph={result} onClear={() => setResult(null)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
