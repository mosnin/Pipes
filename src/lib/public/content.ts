import { starterTemplates } from "@/domain/templates/catalog";

export const homeSections = {
  hero: {
    title: "One map your team and your agents both read.",
    subtitle: "Draw the nodes, ports, and pipes once. Your team reviews it. Your agents read it.",
    primaryCta: { label: "Start free workspace", href: "/signup?source=home_hero" },
    secondaryCta: { label: "Explore templates", href: "/templates" }
  },
  proof: [
    { title: "Systems, not diagrams", body: "Typed nodes, ports, and pipes keep architecture executable and reviewable." },
    { title: "Validation + simulation", body: "Check structure and run scenario paths before implementation drift reaches production." },
    { title: "Protocol-ready", body: "Expose architecture through stable API/MCP surfaces without re-documenting by hand." },
    { title: "Human + agent collaboration", body: "Teams edit, version, and share one system contract across people and tools." }
  ],
  workflow: ["Model", "Validate", "Simulate", "Version", "Integrate"],
  finalCta: { label: "Start free workspace", href: "/signup?source=home_final" }
};

export const useCases = [
  { slug: "multi-agent-systems", title: "Multi-agent systems", problem: "Coordinating planners, specialists, and reviewers across one reliable contract is hard.", fit: "Pipes hands off planners, specialists, and reviewers through one typed contract.", workflow: ["Start from multi-agent template", "Add role-specific agents/tools", "Validate routing and interfaces", "Share via protocol for integrations"], templateIds: ["multi-agent-research"] },
  { slug: "automation-workflows", title: "Automation workflows", problem: "Operational automations degrade when triggers and branch logic are undocumented.", fit: "Pipes keeps automation triggers, decisions, and actions in one reusable system model.", workflow: ["Select automation starter", "Encode decision branches", "Simulate execution paths", "Version and deploy with confidence"], templateIds: ["automation-workflow"] },
  { slug: "support-operations", title: "Support and operations systems", problem: "Support flows need clear escalation and guardrails as teams scale.", fit: "Pipes captures triage, policy checks, and human approval points explicitly.", workflow: ["Use support ops template", "Add compliance guardrails", "Define escalation boundaries", "Share onboarding-ready system docs"], templateIds: ["support-ops-system"] },
  { slug: "technical-system-design", title: "Technical system design", problem: "Architecture docs and implementation plans diverge quickly.", fit: "One map your team reads. Your agents read it too.", workflow: ["Map services and boundaries", "Validate dependencies", "Export canonical schema", "Drive implementation from system memory"], templateIds: ["automation-workflow"] },
  { slug: "agency-handoff", title: "Agency and consultant handoff", problem: "Client handoff often loses intent, constraints, and integration details.", fit: "Pipes provides a transferable system artifact with versions, notes, and protocol endpoints.", workflow: ["Model current + target architecture", "Attach decision rationale", "Export handoff manifest", "Enable client iteration safely"], templateIds: ["support-ops-system"] }
] as const;

export const comparisons = [
  { slug: "figma", title: "Pipes vs Figma", summary: "Figma excels at interface design. Pipes is built for executable system architecture.", differences: ["Pipes types every node, port, and pipe.", "Built-in validation/simulation for system logic", "Protocol and schema surfaces for integrations"], bestFor: "When architecture needs to be reusable operational memory, not only visual communication." },
  { slug: "miro", title: "Pipes vs Miro", summary: "Miro is excellent for broad collaborative canvases. Pipes focuses on structured system specification.", differences: ["Explicit node/port contracts", "Versioned system exports", "Agent and protocol-ready outputs"], bestFor: "When teams need a governed system model that survives beyond workshops." },
  { slug: "lucidchart", title: "Pipes vs Lucidchart", summary: "Lucidchart draws diagrams. Pipes draws systems your agents can read.", differences: ["Schema-first exports", "Validation and simulation loops", "Product and protocol integration path"], bestFor: "When architecture artifacts are consumed by both humans and software systems." },
  { slug: "ai-generated-diagrams", title: "Pipes vs generic AI-generated diagrams", summary: "AI-generated diagrams are fast drafts; Pipes is ongoing system memory with governance.", differences: ["Bounded revision lifecycle", "Typed canonical schema", "Operational trust surfaces"], bestFor: "When speed must coexist with repeatability, reviewability, and long-term maintainability." }
] as const;

export const templateMarketing = starterTemplates.map((template) => ({
  id: template.id,
  slug: template.id,
  title: template.title,
  description: template.description,
  category: template.category,
  useCase: template.useCase,
  complexity: template.complexity,
  preview: `${template.nodes.length} nodes · ${template.pipes.length} connections`,
  keywords: [template.category.toLowerCase(), template.useCase.toLowerCase(), template.complexity]
}));
