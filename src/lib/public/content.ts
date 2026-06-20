import { starterTemplates } from "@/domain/templates/catalog";

export const homeSections = {
  hero: {
    title: "Describe your system. Watch it build itself.",
    subtitle: "Type one sentence. The agent draws the nodes, ports, and pipes on the canvas in front of you.",
    primaryCta: { label: "Start free", href: "/signup?source=home_hero" },
    secondaryCta: { label: "Explore starters", href: "/templates" }
  },
  proof: [
    { title: "Type a sentence", body: "The chat is the input. The canvas is the output. No second window." },
    { title: "Watch it draw", body: "Nodes, ports, and typed pipes land in under two seconds." },
    { title: "Correct it like a teammate", body: "Drag a node and the agent yields. Cmd-Z undoes the whole turn." },
    { title: "Hand any agent a token", body: "Claude reads the same graph through one MCP endpoint." }
  ],
  workflow: ["Describe", "Build", "Correct", "Hand off"],
  finalCta: { label: "Start free", href: "/signup?source=home_final" }
};

export const useCases = [
  { slug: "multi-agent-systems", title: "Multi-agent systems", problem: "Coordinating planners, specialists, and reviewers across one reliable contract is hard.", fit: "Looper handles planners, specialists, and reviewers through one typed contract.", workflow: ["Describe the system in one sentence", "Watch the agent draw the nodes", "Correct what it got wrong", "Hand any agent a token"], templateIds: ["multi-agent-research"] },
  { slug: "automation-workflows", title: "Automation workflows", problem: "Operational automations degrade when triggers and branch logic are undocumented.", fit: "Looper keeps automation triggers, decisions, and actions in one reusable system model.", workflow: ["Describe the trigger and the branches", "Watch the agent draw the flow", "Drag and edit what is off", "Hand it to your runtime"], templateIds: ["automation-workflow"] },
  { slug: "support-operations", title: "Support and operations systems", problem: "Support flows need clear escalation and guardrails as teams scale.", fit: "Looper captures triage, policy checks, and human approval points explicitly.", workflow: ["Describe the triage flow", "Watch the agent place guardrails and approvals", "Edit the boundaries that matter", "Share the system with on-call"], templateIds: ["support-ops-system"] },
  { slug: "technical-system-design", title: "Technical system design", problem: "Architecture docs and implementation plans diverge quickly.", fit: "Describe the system. Watch the agent draw it. Your team reads the same map.", workflow: ["Describe services and boundaries", "Watch the agent place dependencies", "Edit what drifts", "Drive implementation from one map"], templateIds: ["automation-workflow"] },
  { slug: "agency-handoff", title: "Agency and consultant handoff", problem: "Client handoff often loses intent, constraints, and integration details.", fit: "Looper provides a transferable system artifact with versions, notes, and protocol endpoints.", workflow: ["Describe current and target architecture", "Let the agent draw both", "Annotate decision rationale", "Hand the client a token"], templateIds: ["support-ops-system"] }
] as const;

export const comparisons = [
  { slug: "figma", title: "Looper vs Figma", summary: "Looper is the only one where you describe the system in plain English.", differences: ["Looper builds the loop from a sentence.", "Looper types every step, port, and connection.", "Looper serves one map to your team and your agents."], bestFor: "When the architecture has to be a system your agents can read, not a picture for review." },
  { slug: "miro", title: "Looper vs Miro", summary: "Looper is the only one where you describe the system in plain English.", differences: ["Looper builds the loop from a sentence.", "Looper types every step and connection.", "Looper hands any agent a token to read the same map."], bestFor: "When the team needs a system that survives the workshop." },
  { slug: "lucidchart", title: "Looper vs Lucidchart", summary: "Looper is the only one where you describe the system in plain English.", differences: ["Looper builds the loop from a sentence.", "Looper exports schema, not images.", "Looper serves the same map to humans and agents."], bestFor: "When the artifact has to be read by humans and software." },
  { slug: "ai-generated-diagrams", title: "Looper vs generic AI-generated diagrams", summary: "Looper is the only one where you describe the system in plain English.", differences: ["Looper builds a typed graph, not a one-shot picture.", "Looper lets you correct it the way you correct a teammate.", "Looper hands any agent a token to read the same graph."], bestFor: "When speed has to coexist with review, edit, and reuse." }
] as const;

export const templateMarketing = starterTemplates.map((template) => ({
  id: template.id,
  slug: template.id,
  title: template.title,
  description: template.description,
  category: template.category,
  useCase: template.useCase,
  complexity: template.complexity,
  preview: `${template.nodes.length} nodes - ${template.pipes.length} connections`,
  keywords: [template.category.toLowerCase(), template.useCase.toLowerCase(), template.complexity]
}));
