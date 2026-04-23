import { SkillDefinitionSchema, type SkillDefinition } from "@/domain/agent_builder/sub_agents";
import type { SubAgentTask } from "@/domain/agent_builder/sub_agents";

const defs: SkillDefinition[] = [
  { id: "design_subsystem_structure", name: "Design subsystem structure", purpose: "Shape subsystem decomposition and boundaries.", expectedInput: "subsystem context pack", allowedTools: ["get_system_summary", "get_selected_context"], expectedOutputType: "plan+action_types", reviewPolicyHints: ["review if structural deletes"], qualityConstraints: ["coherent boundaries", "small staged batches"] },
  { id: "add_memory_and_guardrails", name: "Add memory and guardrails", purpose: "Add reliability and policy guardrails.", expectedInput: "subsystem context pack", allowedTools: ["get_validation_report"], expectedOutputType: "action_types", reviewPolicyHints: ["review for destructive edits"], qualityConstraints: ["prefer annotations and non-destructive metadata"] },
  { id: "refine_contracts_and_ports", name: "Refine contracts and ports", purpose: "Improve interface contracts and port quality.", expectedInput: "subsystem contracts", allowedTools: ["get_node_type_details", "get_validation_report"], expectedOutputType: "critique+action_types", reviewPolicyHints: ["review for contract-breaking changes"], qualityConstraints: ["preserve compatibility when possible"] },
  { id: "validate_subsystem_edges", name: "Validate subsystem edges", purpose: "Check adjacency and flow risks.", expectedInput: "subsystem and adjacent summaries", allowedTools: ["run_simulation_summary", "get_validation_report"], expectedOutputType: "critique", reviewPolicyHints: ["raise open questions for ambiguity"], qualityConstraints: ["flag uncertain dependencies"] },
  { id: "match_template_for_subsystem", name: "Match template for subsystem", purpose: "Suggest starter-template alignment for a subsystem.", expectedInput: "subsystem summary and goal", allowedTools: ["list_templates"], expectedOutputType: "plan+open_questions", reviewPolicyHints: ["review if forcing risky migration"], qualityConstraints: ["prefer minimal-change alignment"] },
  { id: "summarize_subsystem_diff", name: "Summarize subsystem diff", purpose: "Summarize staged subsystem changes and risks.", expectedInput: "subsystem result artifacts", allowedTools: ["get_selected_context", "get_validation_report"], expectedOutputType: "critique+open_questions", reviewPolicyHints: ["highlight unresolved risk"], qualityConstraints: ["no mutation claims"] }
].map((d) => SkillDefinitionSchema.parse(d));

export function listSkillDefinitions() { return defs; }
export function getSkillDefinition(id: string) { return defs.find((d) => d.id === id) ?? null; }

const allowedRoleBySkill: Record<string, SubAgentTask["role"][]> = {
  design_subsystem_structure: ["architect_sub_agent"],
  add_memory_and_guardrails: ["subsystem_builder_sub_agent", "architect_sub_agent"],
  refine_contracts_and_ports: ["subsystem_builder_sub_agent", "diff_reviewer_sub_agent"],
  validate_subsystem_edges: ["validation_sub_agent"],
  match_template_for_subsystem: ["architect_sub_agent", "subsystem_builder_sub_agent"],
  summarize_subsystem_diff: ["diff_reviewer_sub_agent", "validation_sub_agent"]
};

export function isSkillAllowedForRole(skillId: string, role: SubAgentTask["role"]) {
  return (allowedRoleBySkill[skillId] ?? []).includes(role);
}
