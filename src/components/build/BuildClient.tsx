"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowRight, Loader2, GitBranch, Play, AlertTriangle, Info, CheckCircle2, Import } from "lucide-react";
import { toast } from "sonner";
import { getNodeTypeConfig } from "@/lib/nodeTypeConfig";
import type { AgentDag } from "@/lib/ai/dag_planner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXAMPLE_GOALS = [
  "Process 10,000 customer support emails: categorize, draft responses, escalate urgent tickets to humans",
  "Build a daily competitive intelligence report: scrape 5 competitor sites, extract pricing/features, summarize changes",
  "Onboard a new enterprise customer: provision accounts, send welcome sequences, schedule kickoff, alert CSM",
  "Validate and deploy a software PR: run tests, security scan, performance benchmark, human review, deploy to staging",
];

const PARALLELISM_OPTIONS = [
  { value: "auto", label: "Auto", description: "AI decides what to parallelize" },
  { value: "parallel", label: "Maximize parallel", description: "Run everything independently at once" },
  { value: "sequential", label: "Sequential", description: "One step at a time, simpler to debug" },
] as const;

// ---------------------------------------------------------------------------
// Execution plan visualizer
// ---------------------------------------------------------------------------

function ExecutionLevel({
  level,
  nodeIds,
  description,
  nodes,
  active,
}: {
  level: number;
  nodeIds: string[];
  description: string;
  nodes: AgentDag["nodes"];
  active: boolean;
}) {
  const levelNodes = nodes.filter((n) => nodeIds.includes(n.id));
  const isParallel = nodeIds.length > 1;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: level * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
      className="flex items-start gap-4"
    >
      {/* Level indicator */}
      <div className="flex flex-col items-center gap-1 shrink-0 w-8">
        <div
          className={[
            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border",
            active
              ? "bg-violet-600 border-violet-600 text-white"
              : "bg-white border-black/[0.1] text-[#8E8E93]",
          ].join(" ")}
        >
          {level}
        </div>
        <div className="w-px flex-1 bg-black/[0.06] min-h-[20px]" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <p className="t-label font-semibold text-[#111]" style={{ fontSize: 12 }}>{description}</p>
          {isParallel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 t-caption text-violet-700" style={{ fontSize: 10 }}>
              <GitBranch size={9} />
              {nodeIds.length}x parallel
            </span>
          )}
        </div>
        <div className={["flex gap-2", isParallel ? "flex-row flex-wrap" : "flex-col"].join(" ")}>
          {levelNodes.map((node) => {
            const cfg = getNodeTypeConfig(node.type);
            return (
              <div
                key={node.id}
                className="flex items-center gap-2 rounded-lg border px-3 py-2"
                style={{ borderColor: `${cfg.color}30`, background: cfg.bgLight }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
                <div>
                  <p className="t-label font-semibold text-[#111]" style={{ fontSize: 12 }}>{node.title}</p>
                  <p className="t-overline text-[#8E8E93]" style={{ fontSize: 10 }}>{node.type}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function DagPreview({ dag }: { dag: AgentDag }) {
  const [importing, setImporting] = useState(false);
  const [activeLevel] = useState<number | null>(null);

  async function handleImport() {
    setImporting(true);
    const id = toast.loading("Importing DAG as new loop...");
    try {
      const now = new Date().toISOString();
      const systemId = `sys_${Math.random().toString(36).slice(2, 10)}`;

      const nodes = dag.nodes.map((n) => ({
        id: `node_${n.id}`,
        systemId,
        type: n.type,
        title: n.title,
        description: n.description ?? "",
        position: { x: n.x, y: n.y },
        config: {},
        portIds: [],
      }));

      const nodeIdMap = Object.fromEntries(dag.nodes.map((n) => [n.id, `node_${n.id}`]));
      const ports: object[] = [];
      const pipes: object[] = [];

      dag.pipes.forEach((p, i) => {
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
        system: { id: systemId, workspaceId: "ws_import", name: dag.systemName, description: dag.description, createdAt: now, updatedAt: now, status: "active" },
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

      toast.success("Loop created!", { id, description: dag.systemName });
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

  const totalLevels = dag.executionPlan.levels.length;
  const maxParallelism = Math.max(...dag.executionPlan.levels.map((l) => l.nodeIds.length));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      className="mt-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 size={15} className="text-emerald-500" />
            <span className="t-overline text-[#8E8E93]">DAG planned</span>
          </div>
          <h2 className="t-h3 text-[#111]">{dag.systemName}</h2>
          {dag.description && (
            <p className="mt-1 t-caption text-[#3C3C43]" style={{ fontSize: 12, maxWidth: "60ch" }}>
              {dag.description}
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

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6 p-4 rounded-xl border border-black/[0.06] bg-[#FAFAFA]">
        <div>
          <p className="t-overline text-[#8E8E93]">Nodes</p>
          <p className="mt-0.5 t-label font-semibold text-[#111]">{dag.nodes.length}</p>
        </div>
        <div>
          <p className="t-overline text-[#8E8E93]">Execution levels</p>
          <p className="mt-0.5 t-label font-semibold text-[#111]">{totalLevels}</p>
        </div>
        <div>
          <p className="t-overline text-[#8E8E93]">Max parallelism</p>
          <p className="mt-0.5 t-label font-semibold text-[#111]">{maxParallelism}x</p>
        </div>
        <div>
          <p className="t-overline text-[#8E8E93]">Parallelizable</p>
          <p className="mt-0.5 t-label font-semibold text-[#111]">{dag.parallelizable ? "Yes" : "No"}</p>
        </div>
      </div>

      {/* Execution plan */}
      <div className="mb-6">
        <p className="t-label font-semibold text-[#111] mb-4">Execution plan</p>
        <div className="rounded-xl border border-black/[0.06] bg-white p-4">
          {dag.executionPlan.levels.map((lvl) => (
            <ExecutionLevel
              key={lvl.level}
              level={lvl.level}
              nodeIds={lvl.nodeIds}
              description={lvl.description}
              nodes={dag.nodes}
              active={activeLevel === lvl.level}
            />
          ))}
        </div>
      </div>

      {/* Notes */}
      {(dag.assumptions.length > 0 || dag.warnings.length > 0) && (
        <div className="flex flex-col gap-3">
          {dag.assumptions.map((a, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg border border-black/[0.06] bg-[#FAFAFA] px-3.5 py-2.5">
              <Info size={13} className="text-[#8E8E93] mt-0.5 shrink-0" />
              <p className="t-caption text-[#3C3C43]" style={{ fontSize: 12 }}>{a}</p>
            </div>
          ))}
          {dag.warnings.map((w, i) => (
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

export function BuildClient() {
  const [goal, setGoal] = useState("");
  const [context, setContext] = useState("");
  const [parallelism, setParallelism] = useState<"auto" | "parallel" | "sequential">("auto");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentDag | null>(null);

  async function handleBuild() {
    if (!goal.trim()) {
      toast.error("Describe the goal first");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal, context: context || undefined, parallelism }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Planning failed");
      setResult(json.data);
    } catch (err) {
      toast.error("Planning failed", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Goal input */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Left */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2.5">
            <label className="t-label font-semibold text-[#111]">Goal</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Describe what you want agents to accomplish. Be specific about inputs, outputs, and any constraints..."
              className="w-full h-28 resize-none rounded-xl border border-black/[0.1] bg-white px-4 py-3.5 t-body text-[#111] text-[13px] leading-relaxed placeholder:text-[#8E8E93] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <label className="t-label font-semibold text-[#111] flex items-center gap-1.5">
              Context <span className="t-caption text-[#8E8E93] font-normal">(optional)</span>
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Relevant tools, APIs, constraints, or existing infrastructure the agents should be aware of..."
              className="w-full h-20 resize-none rounded-xl border border-black/[0.1] bg-white px-4 py-3.5 t-body text-[#111] text-[13px] leading-relaxed placeholder:text-[#8E8E93] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors"
            />
          </div>

          {/* Example goals */}
          {!goal && (
            <div>
              <p className="t-overline text-[#8E8E93] mb-2">Examples</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_GOALS.map((eg) => (
                  <button
                    key={eg}
                    onClick={() => setGoal(eg)}
                    className="text-left rounded-lg border border-black/[0.07] bg-white px-3 py-2 t-caption text-[#3C3C43] hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                    style={{ fontSize: 11 }}
                  >
                    {eg.length > 70 ? eg.slice(0, 67) + "..." : eg}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Options */}
        <div className="flex flex-col gap-5">
          <div>
            <p className="t-label font-semibold text-[#111] mb-2.5">Parallelism</p>
            <div className="flex flex-col gap-2">
              {PARALLELISM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setParallelism(opt.value)}
                  className={[
                    "flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                    parallelism === opt.value
                      ? "border-violet-300 bg-violet-50 text-violet-700"
                      : "border-black/[0.08] bg-white text-[#3C3C43] hover:border-black/[0.15]",
                  ].join(" ")}
                >
                  <div>
                    <p className="t-label font-semibold" style={{ fontSize: 13 }}>{opt.label}</p>
                    <p className="t-caption" style={{ fontSize: 11, opacity: 0.7 }}>{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleBuild}
            disabled={loading || !goal.trim()}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 t-label font-semibold text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Planning DAG...
              </>
            ) : (
              <>
                <Play size={14} />
                Plan Workflow
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      <AnimatePresence>
        {result && <DagPreview dag={result} />}
      </AnimatePresence>
    </div>
  );
}
