"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Code2, BookOpen, ScrollText, Sparkles, ArrowRight, AlertTriangle, Info, CheckCircle2, Loader2, Import } from "lucide-react";
import { toast } from "sonner";
import { getNodeTypeConfig } from "@/lib/nodeTypeConfig";
import type { CompiledGraph } from "@/lib/ai/compiler";
import type { DocType } from "@/lib/ai/compiler";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOC_TYPE_OPTIONS: { value: DocType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "sop", label: "SOP", icon: <ScrollText size={15} />, description: "Standard operating procedure" },
  { value: "api_spec", label: "API Spec", icon: <Code2 size={15} />, description: "OpenAPI, Swagger, or API docs" },
  { value: "documentation", label: "Docs", icon: <FileText size={15} />, description: "Technical or product docs" },
  { value: "book", label: "Book / Article", icon: <BookOpen size={15} />, description: "Frameworks, books, long-form" },
];

const PLACEHOLDER: Record<DocType, string> = {
  sop: `Example:\n1. Receive customer support ticket\n2. Classify severity (P1-P4)\n3. If P1: immediately escalate to on-call engineer\n4. If P2-P3: assign to queue within 4 hours\n5. Agent drafts resolution\n6. Human reviews response before sending\n7. Close ticket and log resolution in CRM`,
  api_spec: `Paste your OpenAPI spec, Swagger YAML, or describe your API:\n\nPOST /v1/payments\n  - Creates a payment intent\n  - Required: amount, currency, customer_id\n  - Returns: payment_intent_id, status\n\nGET /v1/payments/{id}\n  - Retrieves payment status\n  - Returns: status, amount, metadata`,
  documentation: `Paste any technical documentation, README, or system description. Looper will extract the key processes and build an executable agent graph from it.`,
  book: `Paste a chapter, section, or key excerpt from a book, article, or framework description. Looper will map the concepts and decision flows to a graph.`,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NodeCard({ node, index }: { node: CompiledGraph["nodes"][0]; index: number }) {
  const cfg = getNodeTypeConfig(node.type);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative rounded-xl border border-black/[0.07] bg-white p-3.5 flex flex-col gap-1.5 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ background: cfg.color }}
        />
        <span className="t-overline text-[#8E8E93]" style={{ fontSize: 10 }}>
          {node.type}
        </span>
      </div>
      <p className="t-label font-semibold text-[#111]" style={{ fontSize: 13 }}>
        {node.title}
      </p>
      {node.description && (
        <p className="t-caption text-[#3C3C43]" style={{ fontSize: 11, lineHeight: 1.5 }}>
          {node.description}
        </p>
      )}
    </motion.div>
  );
}

function GraphPreview({ graph }: { graph: CompiledGraph }) {
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    setImporting(true);
    const id = toast.loading("Importing as new loop...");
    try {
      // Convert AiSystemDraft to looper_schema_v1 import format
      const now = new Date().toISOString();
      const systemId = `sys_${Math.random().toString(36).slice(2, 10)}`;

      const nodes = graph.nodes.map((n) => ({
        id: `node_${n.id}`,
        systemId,
        type: n.type,
        title: n.title,
        description: n.description ?? "",
        position: { x: n.x, y: n.y },
        config: {},
        portIds: [],
      }));

      // Build port + pipe map
      const nodeIdMap = Object.fromEntries(graph.nodes.map((n) => [n.id, `node_${n.id}`]));
      const ports: object[] = [];
      const pipes: object[] = [];

      graph.pipes.forEach((p, i) => {
        const fromNodeId = nodeIdMap[p.fromNodeId];
        const toNodeId = nodeIdMap[p.toNodeId];
        if (!fromNodeId || !toNodeId) return;
        const outPortId = `port_out_${i}`;
        const inPortId = `port_in_${i}`;
        ports.push({ id: outPortId, nodeId: fromNodeId, key: "output", label: "Output", direction: "output", dataType: "any", required: false });
        ports.push({ id: inPortId, nodeId: toNodeId, key: "input", label: "Input", direction: "input", dataType: "any", required: false });
        pipes.push({ id: `pipe_${i}`, systemId, fromPortId: outPortId, toPortId: inPortId });
      });

      const schema = {
        version: 1,
        exportedAt: now,
        system: { id: systemId, workspaceId: "ws_import", name: graph.systemName, description: graph.description, createdAt: now, updatedAt: now, status: "active" },
        nodes,
        ports,
        pipes,
        groups: [],
        annotations: [],
      };

      const res = await fetch("/api/import/system", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schema, mode: "new" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Import failed");

      toast.success("Loop created!", { id, description: graph.systemName });
      const importedId = json.data?.system?.id ?? json.data?.systemId;
      if (importedId) {
        setTimeout(() => { window.location.href = `/systems/${importedId}`; }, 800);
      }
    } catch (err) {
      toast.error("Import failed", { id, description: (err as Error).message });
    } finally {
      setImporting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      className="mt-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={15} className="text-emerald-500" />
            <span className="t-overline text-[#8E8E93]">Compiled successfully</span>
          </div>
          <h2 className="t-h3 text-[#111]">{graph.systemName}</h2>
          {graph.description && (
            <p className="mt-1 t-caption text-[#3C3C43]" style={{ fontSize: 12, maxWidth: "60ch" }}>
              {graph.description}
            </p>
          )}
        </div>
        <button
          onClick={handleImport}
          disabled={importing}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 t-label font-semibold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors shrink-0"
        >
          {importing ? <Loader2 size={14} className="animate-spin" /> : <Import size={14} />}
          Import as Loop
        </button>
      </div>

      {/* Stats row */}
      <div className="flex gap-6 mb-6">
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

      {/* Node grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {graph.nodes.map((node, i) => (
          <NodeCard key={node.id} node={node} index={i} />
        ))}
      </div>

      {/* Assumptions + Warnings */}
      {(graph.assumptions.length > 0 || graph.warnings.length > 0) && (
        <div className="mt-6 flex flex-col gap-3">
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
  const [docType, setDocType] = useState<DocType>("sop");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompiledGraph | null>(null);

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
        body: JSON.stringify({ content, docType }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Compilation failed");
      setResult(json.data);
    } catch (err) {
      toast.error("Compilation failed", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Input panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Left: Document textarea */}
        <div className="flex flex-col gap-3">
          <label className="t-label font-semibold text-[#111]">Document</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={PLACEHOLDER[docType]}
            className="w-full h-64 resize-none rounded-xl border border-black/[0.1] bg-white px-4 py-3.5 t-body text-[#111] text-[13px] leading-relaxed placeholder:text-[#8E8E93] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors font-mono"
            spellCheck={false}
          />
          <p className="t-caption text-[#8E8E93]" style={{ fontSize: 11 }}>
            Paste text, a URL you copied from, or raw content up to 20,000 characters.
          </p>
        </div>

        {/* Right: Options */}
        <div className="flex flex-col gap-5">
          <div>
            <p className="t-label font-semibold text-[#111] mb-2.5">Document type</p>
            <div className="flex flex-col gap-2">
              {DOC_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDocType(opt.value)}
                  className={[
                    "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                    docType === opt.value
                      ? "border-violet-300 bg-violet-50 text-violet-700"
                      : "border-black/[0.08] bg-white text-[#3C3C43] hover:border-black/[0.15] hover:text-[#111]",
                  ].join(" ")}
                >
                  <span className={docType === opt.value ? "text-violet-600" : "text-[#8E8E93]"}>
                    {opt.icon}
                  </span>
                  <div>
                    <p className="t-label font-semibold" style={{ fontSize: 13 }}>{opt.label}</p>
                    <p className="t-caption" style={{ fontSize: 11, opacity: 0.7 }}>{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCompile}
            disabled={loading || !content.trim()}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 t-label font-semibold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      </div>

      {/* Result */}
      <AnimatePresence>
        {result && <GraphPreview graph={result} />}
      </AnimatePresence>
    </div>
  );
}
