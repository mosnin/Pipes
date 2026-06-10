"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * ProtocolCapabilityGrid
 *
 * Deep grid of the 11 MCP capabilities. Each card carries:
 *   - capability name (the token scope)
 *   - one-sentence description
 *   - example scope set
 *   - example MCP tool call snippet
 *
 * Hover lifts the card and reveals the "View details" link.
 */

export interface Capability {
  scope: string;
  title: string;
  description: string;
  scopeExamples: string[];
  exampleTool: string;
  exampleInput: string;
}

const CAPABILITIES: ReadonlyArray<Capability> = [
  {
    scope: "systems:read",
    title: "Read systems",
    description: "List the workspace's systems and fetch any one as a bundle of nodes, ports, and pipes.",
    scopeExamples: ["systems:read", "any system in the workspace"],
    exampleTool: "list_systems",
    exampleInput: "{}",
  },
  {
    scope: "systems:write",
    title: "Author systems",
    description: "Create new systems, rename them, archive them. The workspace boundary is enforced server-side.",
    scopeExamples: ["systems:write", "systems:read"],
    exampleTool: "create_system",
    exampleInput: '{ "name": "Research crew v2" }',
  },
  {
    scope: "schema:read",
    title: "Export schema",
    description: "Read the canonical pipes_schema_v1 export of any system. The same format the editor round-trips.",
    scopeExamples: ["schema:read", "systems:read"],
    exampleTool: "export_system_schema",
    exampleInput: '{ "systemId": "sys_8a72" }',
  },
  {
    scope: "templates:read",
    title: "Browse starters",
    description: "List the starter catalog. Each starter is a one-sentence brief that becomes a real system.",
    scopeExamples: ["templates:read"],
    exampleTool: "list_templates",
    exampleInput: "{}",
  },
  {
    scope: "templates:instantiate",
    title: "Open a starter",
    description: "Instantiate a starter by id. The agent gets a fresh, validated system in one call.",
    scopeExamples: ["templates:instantiate", "systems:write"],
    exampleTool: "instantiate_template",
    exampleInput: '{ "templateId": "multi-agent-research", "name": "Crew v1" }',
  },
  {
    scope: "versions:read",
    title: "Inspect history",
    description: "Read the version log for any system. Each snapshot is an audited point-in-time.",
    scopeExamples: ["versions:read", "systems:read"],
    exampleTool: "list_versions",
    exampleInput: '{ "systemId": "sys_8a72" }',
  },
  {
    scope: "versions:write",
    title: "Snapshot versions",
    description: "Cut a named snapshot of the live graph. Used to mark a build the team will review.",
    scopeExamples: ["versions:write", "versions:read"],
    exampleTool: "create_version",
    exampleInput: '{ "systemId": "sys_8a72", "name": "Pre-deploy" }',
  },
  {
    scope: "graph:write",
    title: "Mutate the graph",
    description: "Add, update, and delete nodes and pipes. Same surface the in-product agent calls during a build.",
    scopeExamples: ["graph:write", "systems:read"],
    exampleTool: "apply_graph_actions",
    exampleInput: '{ "systemId": "sys_8a72", "action": { "action": "addNode" } }',
  },
  {
    scope: "comments:write",
    title: "Post comments",
    description: "Attach a comment to a system or a specific node. Threads show up in the review surface.",
    scopeExamples: ["comments:write"],
    exampleTool: "add_comment",
    exampleInput: '{ "systemId": "sys_8a72", "body": "Looks right." }',
  },
  {
    scope: "import:write",
    title: "Import raw schema",
    description: "Create a system directly from a pipes_schema_v1 payload. The validator runs before any write.",
    scopeExamples: ["import:write", "systems:write"],
    exampleTool: "create_system_from_schema",
    exampleInput: '{ "canonical": { "version": "1", ... } }',
  },
  {
    scope: "validation:read",
    title: "Read validation",
    description: "Pull the structured validation report. Errors carry a node id or pipe id you can fix in one mutation.",
    scopeExamples: ["validation:read", "systems:read"],
    exampleTool: "get_validation_report",
    exampleInput: '{ "systemId": "sys_8a72" }',
  },
];

interface CapabilityCardProps {
  capability: Capability;
  index: number;
}

function CapabilityCard({ capability, index }: CapabilityCardProps) {
  const reduced = useReducedMotion();
  return (
    <motion.article
      data-testid={`protocol-capability-${capability.scope}`}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.04, ease: [0.2, 0.8, 0.2, 1] }}
      whileHover={reduced ? undefined : { scale: 1.01, y: -2 }}
      className="group relative flex flex-col rounded-[18px] border border-black/[0.08] bg-white p-5 transition-shadow hover:shadow-lg-token hover:border-indigo-200"
    >
      <header className="flex items-start justify-between gap-2">
        <code
          className="inline-flex items-center bg-[#F5F5F7] border border-black/[0.06] px-2 py-0.5 rounded-md t-mono"
          style={{ fontSize: 11.5, color: "#4F46E5" }}
        >
          {capability.scope}
        </code>
        <span className="t-overline text-[#C7C7CC]">
          {String(index + 1).padStart(2, "0")}
        </span>
      </header>

      <h3 className="mt-3 t-title text-[#111]" style={{ letterSpacing: "-0.01em" }}>
        {capability.title}
      </h3>
      <p className="mt-1.5 t-label text-[#3C3C43] leading-relaxed">
        {capability.description}
      </p>

      <div className="mt-4 rounded-[10px] border border-black/[0.06] bg-[#0F1115] px-3 py-2.5">
        <div className="t-overline text-white/40 mb-1">Example call</div>
        <code
          className="t-mono block whitespace-pre-wrap break-all"
          style={{ fontSize: 11.5, lineHeight: 1.55, color: "#E6E6E9" }}
        >
          <span style={{ color: "#F0B86A" }}>{capability.exampleTool}</span>
          <span style={{ color: "#C7C7CC" }}>(</span>
          <span style={{ color: "#A8E060" }}>{capability.exampleInput}</span>
          <span style={{ color: "#C7C7CC" }}>)</span>
        </code>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {capability.scopeExamples.map((s) => (
          <span
            key={s}
            className="inline-flex items-center t-caption text-[#3C3C43] bg-[#F5F5F7] border border-black/[0.06] rounded-full px-2 py-0.5"
          >
            {s}
          </span>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-black/[0.06] flex items-center justify-between">
        <span className="t-caption text-[#8E8E93]">Capability scope</span>
        <Link
          href={`/docs#capability-${capability.scope.replace(":", "-")}`}
          className="inline-flex items-center gap-1 t-caption font-semibold text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
        >
          View details
          <ArrowUpRight size={12} aria-hidden="true" />
        </Link>
      </div>
    </motion.article>
  );
}

export interface ProtocolCapabilityGridProps {
  className?: string;
}

export function ProtocolCapabilityGrid({ className }: ProtocolCapabilityGridProps) {
  return (
    <div
      className={["grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", className ?? ""].join(" ")}
      data-testid="protocol-capability-grid"
    >
      {CAPABILITIES.map((cap, i) => (
        <CapabilityCard key={cap.scope} capability={cap} index={i} />
      ))}
    </div>
  );
}

export const PROTOCOL_CAPABILITIES = CAPABILITIES;
