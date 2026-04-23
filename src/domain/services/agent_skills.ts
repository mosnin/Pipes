import { SkillDefinitionSchema, type SkillDefinition } from "@/domain/agent_builder/sub_agents";

const defs: SkillDefinition[] = [
  { id: "design_subsystem_structure", name: "Design subsystem structure", purpose: "Shape subsystem decomposition and boundaries.", expectedInput: "subsystem context pack", allowedTools: ["get_system_summary", "get_selected_context"], expectedOutputType: "plan+action_types", reviewPolicyHints: ["review if structural deletes"], qualityConstraints: ["coherent boundaries", "small staged batches"] },
  { id: "add_memory_and_guardrails", name: "Add memory and guardrails", purpose: "Add reliability and policy guardrails.", expectedInput: "subsystem context pack", allowedTools: ["get_validation_report"], expectedOutputType: "action_types", reviewPolicyHints: ["review for destructive edits"], qualityConstraints: ["prefer annotations and non-destructive metadata"] },
  { id: "refine_contracts_and_ports", name: "Refine contracts and ports", purpose: "Improve interface contracts and port quality.", expectedInput: "subsystem contracts", allowedTools: ["get_node_type_details", "get_validation_report"], expectedOutputType: "critique+action_types", reviewPolicyHints: ["review for contract-breaking changes"], qualityConstraints: ["preserve compatibility when possible"] },
  { id: "validate_subsystem_edges", name: "Validate subsystem edges", purpose: "Check adjacency and flow risks.", expectedInput: "subsystem and adjacent summaries", allowedTools: ["run_simulation_summary", "get_validation_report"], expectedOutputType: "critique", reviewPolicyHints: ["raise open questions for ambiguity"], qualityConstraints: ["flag uncertain dependencies"] }
].map((d) => SkillDefinitionSchema.parse(d));

export function listSkillDefinitions() { return defs; }
export function getSkillDefinition(id: string) { return defs.find((d) => d.id === id) ?? null; }
