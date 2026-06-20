import { starterTemplates } from "@/domain/templates/catalog";

export const homeSections = {
  hero: {
    title: "Build agent loops, visually.",
    subtitle: "Describe a loop. Watch it appear on the canvas. Refine it with your agent. Share it with the world.",
    primaryCta: { label: "Start free", href: "/signup?source=home_hero" },
    secondaryCta: { label: "Browse loops", href: "/templates" }
  },
  proof: [
    { title: "Describe the loop", body: "Type one sentence. Your agent draws every step, connection, and control node on the canvas." },
    { title: "Refine together", body: "Drag a step and the agent adapts. It sees your edits and proposes what to update next." },
    { title: "Export to any agent", body: "Claude, LangGraph, AutoGen, CrewAI — one MCP token. Any agent reads the same loop." },
    { title: "Share or sell it", body: "Publish your loop to the marketplace. Set a price. Earn when others install it." }
  ],
  workflow: ["Describe", "Build", "Refine", "Share"],
  finalCta: { label: "Start free", href: "/signup?source=home_final" }
};

export const useCases = [
  { slug: "multi-agent-systems", title: "Multi-agent loops", problem: "Coordinating planners, specialists, and reviewers with no shared loop definition breaks quickly.", fit: "Describe who does what and in what order. Looper draws the loop. Every agent reads the same map.", workflow: ["Describe the agent roles in one sentence", "Watch the loop appear on canvas", "Add evaluators and checkpoints", "Hand any agent an MCP token"], templateIds: ["multi-agent-research"] },
  { slug: "automation-workflows", title: "Research loops", problem: "Research agents that find, synthesize, critique, and repeat are hard to design without a visual loop.", fit: "Looper makes the find-synthesize-critique-repeat pattern explicit and shareable.", workflow: ["Describe the research goal", "Watch the loop draw: fetch, synthesize, evaluate, repeat", "Set max-iterations and stop condition on the LoopControl step", "Export to your agent or share with your team"], templateIds: ["automation-workflow"] },
  { slug: "support-operations", title: "Support loops", problem: "Support triage that routes, classifies, and escalates is fragile when the logic is undocumented.", fit: "Looper captures triage, classification, routing, and escalation as a visual loop anyone can read.", workflow: ["Describe the incoming event and the escalation path", "Watch the agent place guardrails and human-review steps", "Edit routing conditions in the inspector", "Share the loop with on-call"], templateIds: ["support-ops-system"] },
  { slug: "technical-system-design", title: "Code review loops", problem: "Code review processes that scan, flag, fix, and re-verify are inconsistent without a shared loop.", fit: "Design the scan-flag-fix-verify loop visually. Every tool and agent reads from the same definition.", workflow: ["Describe the review stages", "Watch the loop appear with evaluator steps", "Add HumanReview gates where approval matters", "Hand your CI agent an MCP token"], templateIds: ["automation-workflow"] },
  { slug: "agency-handoff", title: "Sales loops", problem: "Sales outreach that enriches, qualifies, drafts, and follows up loses context across handoffs.", fit: "Looper keeps enrich-qualify-draft-follow-up as one loop your whole team can read and improve.", workflow: ["Describe the prospect journey", "Watch the agent draw the loop with checkpoint steps", "Annotate qualification criteria", "Share the loop with your sales team"], templateIds: ["support-ops-system"] }
] as const;

export const comparisons = [
  { slug: "figma", title: "Looper vs Figma", summary: "Figma designs for humans. Looper designs for agents and humans together.", differences: ["Looper builds the loop from one sentence.", "Looper types every step so agents can read it, not just designers.", "Looper exports MCP tokens, not image files."], bestFor: "When the artifact has to be a live definition that agents read, not a static mockup." },
  { slug: "miro", title: "Looper vs Miro", summary: "Miro is a whiteboard. Looper is a loop definition that agents act on.", differences: ["Looper builds the loop from one sentence.", "Looper types every connection so agents know what flows where.", "Looper hands any agent an MCP token to read the same loop."], bestFor: "When your team needs a loop that survives the workshop and gets deployed." },
  { slug: "lucidchart", title: "Looper vs Lucidchart", summary: "Lucidchart draws. Looper defines.", differences: ["Looper builds the loop from one sentence.", "Looper exports schema that agents read, not images that humans only see.", "Looper makes every step typed and executable."], bestFor: "When the diagram has to be readable by humans and run by software." },
  { slug: "ai-generated-diagrams", title: "Looper vs generic AI diagramming", summary: "Generic AI diagrams are one-shot. Looper is a co-authoring canvas.", differences: ["Looper builds a typed loop graph, not a one-shot picture.", "Looper lets you and your agent refine together in real time.", "Looper hands any agent a token to read the same definition."], bestFor: "When you need to iterate on the loop with your agent, not just generate a picture once." }
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
