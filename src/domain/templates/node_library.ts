// Single-node-type design (Steve Jobs cut). Legacy types remain in the schema enum for backwards compat.
import type { NodeType } from "@/domain/pipes_schema_v1/schema";

export type PortType = "string" | "number" | "boolean" | "json" | "event" | "file" | "any";
export type NodeLibraryCategory = "Core" | "Reasoning" | "I/O" | "Control" | "Data";

export type NodeLibraryEntry = {
  nodeType: NodeType;
  name: string;
  description: string;
  category: NodeLibraryCategory;
  inputTypes: PortType[];
  outputTypes: PortType[];
  typicalUse: string;
  tags: string[];
  promoted?: boolean;
};

export type InsertContextMode = "canvas" | "selectedNode" | "selectedEdge" | "sourcePort" | "targetPort";

export type InsertContext = {
  mode: InsertContextMode;
  sourceNodeType?: NodeType;
  targetNodeType?: NodeType;
};

// The single primary entry users see in the library palette. Every node is uniformly a "Node";
// users describe what it is via title and config.
export const primaryNodeLibraryEntry: NodeLibraryEntry = {
  nodeType: "Node",
  name: "New node",
  description: "Describe what this node is. Pipes treats every node uniformly -- you decide what it does.",
  category: "Core",
  inputTypes: ["any"],
  outputTypes: ["any"],
  typicalUse: "Any step in a system. Title and config define behavior.",
  tags: ["node", "generic", "any"],
  promoted: true
};

// Legacy catalog kept for backwards compatibility (existing tests, agent tools, persisted data).
// New UI entry points should prefer primaryNodeLibraryEntry / nodeLibraryCatalog[0].
export const legacyNodeLibraryCatalog: NodeLibraryEntry[] = [
  { nodeType: "Input", name: "Input", description: "Capture external user or system input.", category: "I/O", inputTypes: ["any"], outputTypes: ["string", "json", "file"], typicalUse: "Entry point for a workflow.", tags: ["entry", "ingest", "trigger"], promoted: true },
  { nodeType: "Output", name: "Output", description: "Finalize and deliver workflow results.", category: "I/O", inputTypes: ["string", "json", "file"], outputTypes: ["any"], typicalUse: "Present generated artifacts.", tags: ["delivery", "result", "sink"], promoted: true },
  { nodeType: "Agent", name: "Agent", description: "General reasoning and orchestration node.", category: "Reasoning", inputTypes: ["string", "json", "event", "any"], outputTypes: ["string", "json", "event", "any"], typicalUse: "Plan or coordinate multi-step tasks.", tags: ["reasoning", "planner", "coordinator"], promoted: true },
  { nodeType: "Model", name: "Model", description: "Inference endpoint for language or multimodal tasks.", category: "Reasoning", inputTypes: ["string", "json", "file"], outputTypes: ["string", "json"], typicalUse: "Generate or transform content.", tags: ["llm", "inference", "generation"] },
  { nodeType: "Tool", name: "Tool", description: "Call a deterministic external capability.", category: "Core", inputTypes: ["json", "string", "any"], outputTypes: ["json", "string", "event"], typicalUse: "Retrieve data or execute actions.", tags: ["api", "action", "integration"], promoted: true },
  { nodeType: "Prompt", name: "Prompt", description: "Template and structure prompt instructions.", category: "Reasoning", inputTypes: ["string", "json"], outputTypes: ["string"], typicalUse: "Compose reusable instruction frames.", tags: ["instruction", "template", "guardrails"] },
  { nodeType: "Memory", name: "Memory", description: "Persist and recall prior context.", category: "Data", inputTypes: ["json", "string", "event"], outputTypes: ["json", "string"], typicalUse: "Long-term or session memory retrieval.", tags: ["state", "storage", "context"] },
  { nodeType: "Datastore", name: "Datastore", description: "Read/write structured records.", category: "Data", inputTypes: ["json", "string", "number"], outputTypes: ["json", "event"], typicalUse: "Structured persistence or lookup.", tags: ["db", "index", "records"] },
  { nodeType: "Decision", name: "Decision", description: "Branch by predicate or classification.", category: "Control", inputTypes: ["json", "boolean", "number", "string"], outputTypes: ["event", "json", "boolean"], typicalUse: "Conditional branching and policy checks.", tags: ["branch", "if", "policy"] },
  { nodeType: "Router", name: "Router", description: "Dispatch to one of many downstream paths.", category: "Control", inputTypes: ["event", "json", "string"], outputTypes: ["event", "json"], typicalUse: "Traffic split across specialists.", tags: ["dispatch", "fanout", "route"] },
  { nodeType: "Loop", name: "Loop", description: "Iterate a sequence with stopping criteria.", category: "Control", inputTypes: ["json", "event", "number"], outputTypes: ["event", "json", "number"], typicalUse: "Retries, iterative refinements.", tags: ["iterate", "retry", "cycle"] }
];

// nodeLibraryCatalog is the unified catalog. The primary "Node" entry leads; legacy entries
// follow so existing consumers (agent tools, tests, persisted references) keep working.
// New UI surfaces should treat this as a single-choice list and only expose the first entry.
export const nodeLibraryCatalog: NodeLibraryEntry[] = [
  primaryNodeLibraryEntry,
  ...legacyNodeLibraryCatalog
];

const commonPatterns: Partial<Record<NodeType, NodeType[]>> = {
  Input: ["Agent", "Router", "Decision"],
  Agent: ["Tool", "Model", "Memory", "Output"],
  Tool: ["Agent", "Decision", "Output"],
  Model: ["Agent", "Output"],
  Prompt: ["Model", "Agent"],
  Memory: ["Agent", "Decision"],
  Decision: ["Agent", "Tool", "Output"],
  Router: ["Agent", "Tool"],
  Loop: ["Agent", "Tool"],
  Datastore: ["Agent", "Decision"],
  Output: []
};

export function matchesQuery(entry: NodeLibraryEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [entry.name, entry.description, entry.category, entry.typicalUse, ...entry.tags].join(" ").toLowerCase();
  return haystack.includes(q);
}

function hasTypeOverlap(left: PortType[], right: PortType[]): boolean {
  if (left.includes("any") || right.includes("any")) return true;
  return left.some((item) => right.includes(item));
}

export function compatibilityScore(entry: NodeLibraryEntry, context?: InsertContext): number {
  if (!context) return 0;
  let score = 0;
  if (context.mode === "selectedNode" || context.mode === "sourcePort") {
    const from = context.sourceNodeType ? nodeLibraryCatalog.find((item) => item.nodeType === context.sourceNodeType) : undefined;
    if (from && hasTypeOverlap(from.outputTypes, entry.inputTypes)) score += 5;
    if (from && commonPatterns[from.nodeType]?.includes(entry.nodeType)) score += 3;
  }
  if (context.mode === "targetPort") {
    const to = context.targetNodeType ? nodeLibraryCatalog.find((item) => item.nodeType === context.targetNodeType) : undefined;
    if (to && hasTypeOverlap(entry.outputTypes, to.inputTypes)) score += 5;
    if (to && commonPatterns[entry.nodeType]?.includes(to.nodeType)) score += 2;
  }
  if (context.mode === "selectedEdge") score += 1;
  return score;
}

export function rankLibraryEntries(input: {
  query: string;
  favorites: string[];
  recents: string[];
  context?: InsertContext;
}): NodeLibraryEntry[] {
  const recency = new Map(input.recents.map((item, idx) => [item, idx]));
  return nodeLibraryCatalog
    .filter((entry) => matchesQuery(entry, input.query))
    .sort((a, b) => {
      const scoreDiff = compatibilityScore(b, input.context) - compatibilityScore(a, input.context);
      if (scoreDiff !== 0) return scoreDiff;
      const promotedDiff = Number(Boolean(b.promoted)) - Number(Boolean(a.promoted));
      if (promotedDiff !== 0) return promotedDiff;
      const favoriteDiff = Number(input.favorites.includes(b.nodeType)) - Number(input.favorites.includes(a.nodeType));
      if (favoriteDiff !== 0) return favoriteDiff;
      const recencyA = recency.has(a.nodeType) ? recency.get(a.nodeType)! : Number.MAX_SAFE_INTEGER;
      const recencyB = recency.has(b.nodeType) ? recency.get(b.nodeType)! : Number.MAX_SAFE_INTEGER;
      if (recencyA !== recencyB) return recencyA - recencyB;
      return a.name.localeCompare(b.name);
    });
}

export function groupByCategory(entries: NodeLibraryEntry[]): Array<{ category: NodeLibraryCategory; entries: NodeLibraryEntry[] }> {
  const categories: NodeLibraryCategory[] = ["Core", "Reasoning", "Control", "Data", "I/O"];
  return categories
    .map((category) => ({ category, entries: entries.filter((entry) => entry.category === category) }))
    .filter((group) => group.entries.length > 0);
}
