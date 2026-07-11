// Canonical visual config for node types — used by the compiler and DAG builder UIs.

export type NodeTypeConfig = {
  color: string;       // Accent color (bg for dot, border tint)
  bgLight: string;     // Card background tint
  category: "flow" | "ai" | "data" | "control" | "human" | "infra";
};

export const NODE_TYPE_CONFIG: Record<string, NodeTypeConfig> = {
  // Flow
  Input:        { color: "#16A34A", bgLight: "#F0FDF4", category: "flow" },
  Output:       { color: "#0EA5E9", bgLight: "#F0F9FF", category: "flow" },
  Trigger:      { color: "#D97706", bgLight: "#FFFBEB", category: "flow" },
  Schedule:     { color: "#D97706", bgLight: "#FFFBEB", category: "flow" },

  // AI
  Agent:        { color: "#7C3AED", bgLight: "#F5F3FF", category: "ai" },
  Model:        { color: "#7C3AED", bgLight: "#F5F3FF", category: "ai" },
  Prompt:       { color: "#A855F7", bgLight: "#FAF5FF", category: "ai" },
  Evaluator:    { color: "#D97706", bgLight: "#FFFBEB", category: "ai" },

  // Data
  Memory:       { color: "#0EA5E9", bgLight: "#F0F9FF", category: "data" },
  Datastore:    { color: "#0EA5E9", bgLight: "#F0F9FF", category: "data" },
  Queue:        { color: "#6366F1", bgLight: "#EEF2FF", category: "data" },

  // Control
  Decision:     { color: "#F59E0B", bgLight: "#FFFBEB", category: "control" },
  Condition:    { color: "#F59E0B", bgLight: "#FFFBEB", category: "control" },
  Router:       { color: "#6366F1", bgLight: "#EEF2FF", category: "control" },
  Loop:         { color: "#6366F1", bgLight: "#EEF2FF", category: "control" },
  SubLoop:      { color: "#6366F1", bgLight: "#EEF2FF", category: "control" },
  LoopControl:  { color: "#6366F1", bgLight: "#EEF2FF", category: "control" },

  // Human
  HumanApproval: { color: "#EC4899", bgLight: "#FDF2F8", category: "human" },
  HumanReview:   { color: "#EC4899", bgLight: "#FDF2F8", category: "human" },

  // Actions
  Action:       { color: "#3B82F6", bgLight: "#EFF6FF", category: "flow" },
  Guardrail:    { color: "#EF4444", bgLight: "#FEF2F2", category: "control" },
  Monitor:      { color: "#14B8A6", bgLight: "#F0FDFA", category: "infra" },
  Checkpoint:   { color: "#16A34A", bgLight: "#F0FDF4", category: "control" },

  // Infra
  Tool:         { color: "#64748B", bgLight: "#F8FAFC", category: "infra" },
  ExternalApi:  { color: "#64748B", bgLight: "#F8FAFC", category: "infra" },
  Environment:  { color: "#64748B", bgLight: "#F8FAFC", category: "infra" },
  Subsystem:    { color: "#8B5CF6", bgLight: "#F5F3FF", category: "infra" },

  // Misc
  Node:         { color: "#8E8E93", bgLight: "#F5F5F5", category: "flow" },
  Reference:    { color: "#8E8E93", bgLight: "#F5F5F5", category: "infra" },
  Annotation:   { color: "#8E8E93", bgLight: "#F5F5F5", category: "infra" },
};

export function getNodeTypeConfig(type: string): NodeTypeConfig {
  return NODE_TYPE_CONFIG[type] ?? { color: "#8E8E93", bgLight: "#F5F5F5", category: "flow" };
}
