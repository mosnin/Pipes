import type { NodeType } from "@/domain/pipes_schema_v1/schema";

export type PortType = "string" | "number" | "boolean" | "json" | "event" | "file" | "any";
export type NodeLibraryCategory = "Start and finish" | "Work" | "Branching" | "People and safety" | "Data" | "Notes";

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

/**
 * Every step a person can add from the editor. Subsystem is not here: it is
 * made by grouping steps on the canvas. Descriptions say what a run does with
 * the step, so they must stay true to `src/domain/runs/engine.ts`.
 */
export const nodeLibraryCatalog: NodeLibraryEntry[] = [
  // Start and finish
  { nodeType: "Trigger", name: "Trigger", description: "Starts a run when an event arrives. Set up the event on the Triggers page.", category: "Start and finish", inputTypes: [], outputTypes: ["event", "json"], typicalUse: "Start a run from a webhook or another app.", tags: ["entry", "start", "event", "webhook", "trigger"], promoted: true },
  { nodeType: "Schedule", name: "Schedule", description: "Starts a run on a timetable. Set the timetable on the Triggers page.", category: "Start and finish", inputTypes: [], outputTypes: ["event"], typicalUse: "Run every morning, hour or week.", tags: ["entry", "start", "cron", "timer", "recurring"] },
  { nodeType: "Input", name: "Input", description: "Where a run begins when someone starts it by hand, with the input they give.", category: "Start and finish", inputTypes: ["any"], outputTypes: ["string", "json", "file"], typicalUse: "Entry point for a workflow.", tags: ["entry", "ingest", "start"], promoted: true },
  { nodeType: "Output", name: "Output", description: "The result the run hands back when it finishes.", category: "Start and finish", inputTypes: ["string", "json", "file"], outputTypes: ["any"], typicalUse: "Present generated artifacts.", tags: ["delivery", "result", "sink", "finish"], promoted: true },
  // Work
  { nodeType: "Agent", name: "Agent", description: "A step an agent carries out from the instructions you write for it.", category: "Work", inputTypes: ["string", "json", "event", "any"], outputTypes: ["string", "json", "event", "any"], typicalUse: "Plan or coordinate multi-step tasks.", tags: ["reasoning", "planner", "coordinator"], promoted: true },
  { nodeType: "Tool", name: "Tool", description: "Calls one tool or capability and passes its result on.", category: "Work", inputTypes: ["json", "string", "any"], outputTypes: ["json", "string", "event"], typicalUse: "Retrieve data or execute actions.", tags: ["api", "action", "integration"], promoted: true },
  { nodeType: "Action", name: "Action", description: "Does one concrete thing, such as sending an email or updating a record.", category: "Work", inputTypes: ["json", "string", "any"], outputTypes: ["json", "event"], typicalUse: "Make a change in another system.", tags: ["do", "send", "update", "side effect"] },
  { nodeType: "Model", name: "Model", description: "Asks a language or vision model for an answer.", category: "Work", inputTypes: ["string", "json", "file"], outputTypes: ["string", "json"], typicalUse: "Generate or transform content.", tags: ["llm", "inference", "generation", "reasoning"] },
  { nodeType: "Prompt", name: "Prompt", description: "A reusable set of instructions that a model or agent step reads.", category: "Work", inputTypes: ["string", "json"], outputTypes: ["string"], typicalUse: "Compose reusable instruction frames.", tags: ["instruction", "template", "reasoning"] },
  { nodeType: "ExternalApi", name: "External API", description: "Calls an outside service over HTTP and passes the response on.", category: "Work", inputTypes: ["json", "string"], outputTypes: ["json", "event"], typicalUse: "Fetch or send data to a third-party service.", tags: ["http", "rest", "webhook", "integration", "api"] },
  // Branching
  { nodeType: "Decision", name: "Decision", description: "Branches the run. The performer reports a route label and the run follows the route with that label.", category: "Branching", inputTypes: ["json", "boolean", "number", "string"], outputTypes: ["event", "json", "boolean"], typicalUse: "Choose between outcomes such as approved or needs work.", tags: ["branch", "if", "choose", "route"] },
  { nodeType: "Condition", name: "Condition", description: "Checks one condition. The performer reports which route label holds and the run follows it.", category: "Branching", inputTypes: ["json", "boolean", "number", "string"], outputTypes: ["event", "boolean"], typicalUse: "Yes or no checks, such as score above a threshold.", tags: ["branch", "if", "check", "predicate"] },
  { nodeType: "Router", name: "Router", description: "Sends the run down one of many routes, picked by the route label the performer reports.", category: "Branching", inputTypes: ["event", "json", "string"], outputTypes: ["event", "json"], typicalUse: "Hand work to the right specialist.", tags: ["dispatch", "fanout", "route", "branch"] },
  { nodeType: "Loop", name: "Loop", description: "Repeats until its exit route is taken or the maximum number of iterations is reached.", category: "Branching", inputTypes: ["json", "event", "number"], outputTypes: ["event", "json", "number"], typicalUse: "Retries and rounds of revision.", tags: ["iterate", "retry", "cycle", "repeat"] },
  // People and safety
  { nodeType: "HumanApproval", name: "Human approval", description: "Pauses the run until a person approves it, rejects it or sends it back.", category: "People and safety", inputTypes: ["any"], outputTypes: ["event", "json"], typicalUse: "Sign off before anything leaves the building.", tags: ["approve", "review", "human", "sign off", "inbox"], promoted: true },
  { nodeType: "Guardrail", name: "Guardrail", description: "A check the work must pass before the run moves on, such as a policy or safety rule.", category: "People and safety", inputTypes: ["any"], outputTypes: ["json", "event"], typicalUse: "Block personal data or off-policy output.", tags: ["policy", "safety", "check", "pii"] },
  { nodeType: "Monitor", name: "Monitor", description: "Watches what happens and records it. A run can end here.", category: "People and safety", inputTypes: ["any"], outputTypes: ["event"], typicalUse: "Track latency, cost or quality.", tags: ["observe", "metrics", "alert", "log"] },
  // Data
  { nodeType: "Memory", name: "Memory", description: "Saves context so later steps and later runs can recall it.", category: "Data", inputTypes: ["json", "string", "event"], outputTypes: ["json", "string"], typicalUse: "Long-term or session memory retrieval.", tags: ["state", "storage", "context", "recall"] },
  { nodeType: "Datastore", name: "Datastore", description: "Reads or writes structured records.", category: "Data", inputTypes: ["json", "string", "number"], outputTypes: ["json", "event"], typicalUse: "Structured persistence or lookup.", tags: ["db", "index", "records"] },
  { nodeType: "Queue", name: "Queue", description: "Holds work items so they are handled one at a time, in order.", category: "Data", inputTypes: ["json", "event"], outputTypes: ["json", "event"], typicalUse: "Buffer bursts of incoming work.", tags: ["buffer", "backlog", "fifo"] },
  { nodeType: "Environment", name: "Environment", description: "Settings the steps around it rely on, such as a region or an account.", category: "Data", inputTypes: ["any"], outputTypes: ["json"], typicalUse: "Keep configuration in one place.", tags: ["config", "settings", "variables"] },
  // Notes
  { nodeType: "Reference", name: "Reference", description: "Points to a document or another workflow. Runs skip it.", category: "Notes", inputTypes: ["any"], outputTypes: ["any"], typicalUse: "Link the spec or policy a step follows.", tags: ["link", "doc", "source"] },
  { nodeType: "Annotation", name: "Note", description: "A note on the canvas for people reading the workflow. Runs skip it.", category: "Notes", inputTypes: [], outputTypes: [], typicalUse: "Explain a tricky part of the workflow.", tags: ["comment", "annotation", "explain"] }
];

const commonPatterns: Partial<Record<NodeType, NodeType[]>> = {
  Trigger: ["Agent", "Router", "Decision"],
  Schedule: ["Agent", "Tool"],
  Input: ["Agent", "Router", "Decision"],
  Agent: ["Tool", "Model", "Memory", "Output"],
  Tool: ["Agent", "Decision", "Output"],
  Model: ["Agent", "Output"],
  Prompt: ["Model", "Agent"],
  Memory: ["Agent", "Decision"],
  Decision: ["Agent", "Tool", "Output", "HumanApproval"],
  Condition: ["Agent", "Tool", "Output"],
  HumanApproval: ["Action", "Output", "Agent"],
  Guardrail: ["HumanApproval", "Output", "Agent"],
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
  const categories: NodeLibraryCategory[] = ["Start and finish", "Work", "Branching", "People and safety", "Data", "Notes"];
  return categories
    .map((category) => ({ category, entries: entries.filter((entry) => entry.category === category) }))
    .filter((group) => group.entries.length > 0);
}
