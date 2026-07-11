/**
 * Customers page data: enterprise-feeling logos rendered as wordmarks, plus
 * case study summaries linked to existing /use-cases slugs where they match.
 *
 * Company names are invented placeholders. Persona names and roles match the
 * audience.md voice (staff engineer shipping a multi-agent system to prod).
 */

export type LogoWeight = "regular" | "medium" | "semibold" | "bold";
export type LogoSize = "sm" | "md" | "lg";
export type LogoCase = "normal" | "upper" | "lower";

export interface CustomerLogo {
  /** Wordmark text. ASCII only. */
  name: string;
  /** Geist weight to render. */
  weight: LogoWeight;
  /** Visual size step. */
  size: LogoSize;
  /** Optional letter-spacing override token. */
  tracking?: "tight" | "normal" | "wide";
  /** Casing applied on render. */
  case: LogoCase;
}

export interface CaseStudy {
  /** Unique slug. May map to /use-cases/[slug] for the detail link. */
  slug: string;
  /** Company placeholder. */
  company: string;
  /** Filter category. */
  category: "Engineering" | "Support" | "Sales" | "Data" | "Operations";
  /** Persona attribution. */
  persona: string;
  /** Persona role. */
  role: string;
  /** One outcome metric, headline-sized. */
  outcome: string;
  /** One-line story. */
  story: string;
  /** Linked use-case slug if one exists; else null. */
  useCaseSlug: string | null;
}

export interface FeaturedQuote {
  body: string;
  persona: string;
  role: string;
  company: string;
}

export interface CustomerStat {
  value: number;
  suffix?: string;
  label: string;
}

export const customerLogos: ReadonlyArray<CustomerLogo> = [
  { name: "Northwind Robotics", weight: "bold",     size: "lg", case: "normal", tracking: "tight" },
  { name: "Quay & Co",          weight: "medium",   size: "md", case: "normal" },
  { name: "Lumen Health",       weight: "semibold", size: "md", case: "normal" },
  { name: "Arc Systems",        weight: "bold",     size: "lg", case: "upper",  tracking: "wide" },
  { name: "Glasshouse Studio",  weight: "regular",  size: "md", case: "normal" },
  { name: "Praxis Labs",        weight: "semibold", size: "lg", case: "lower",  tracking: "tight" },
  { name: "Helio Freight",      weight: "bold",     size: "md", case: "normal" },
  { name: "Sable Index",        weight: "medium",   size: "md", case: "normal" },
  { name: "Ferrous Cloud",      weight: "semibold", size: "lg", case: "normal", tracking: "tight" },
  { name: "Maritime Signal",    weight: "regular",  size: "md", case: "normal" },
  { name: "Tessera Bank",       weight: "bold",     size: "md", case: "upper",  tracking: "wide" },
  { name: "Kestrel Audit",      weight: "medium",   size: "md", case: "normal" },
  { name: "Halcyon Energy",     weight: "semibold", size: "lg", case: "normal" },
  { name: "Outpost Studio",     weight: "regular",  size: "md", case: "lower" },
  { name: "Bridgewright",       weight: "bold",     size: "md", case: "normal", tracking: "tight" },
  { name: "Aperture Logic",     weight: "medium",   size: "md", case: "normal" },
];

export const customerStats: ReadonlyArray<CustomerStat> = [
  { value: 1240, suffix: "+", label: "Teams shipping systems" },
  { value: 8650, suffix: "+", label: "Systems built this quarter" },
  { value: 4.2,  suffix: "M", label: "Agent reads this month" },
];

export const caseStudies: ReadonlyArray<CaseStudy> = [
  {
    slug: "northwind-robotics",
    company: "Northwind Robotics",
    category: "Engineering",
    persona: "Maya Reyes",
    role: "Staff engineer",
    outcome: "3 days from sketch to first run",
    story:
      "Planner, specialist, and reviewer agents land on one typed graph. The team reads the same map their fleet runs against.",
    useCaseSlug: "multi-agent-systems",
  },
  {
    slug: "quay-and-co",
    company: "Quay & Co",
    category: "Operations",
    persona: "Daniel Park",
    role: "Infrastructure lead",
    outcome: "62 automations under one map",
    story:
      "Triggers, branches, and side effects sit in one place. The on-call rotation reads the flow without opening Jira.",
    useCaseSlug: "automation-workflows",
  },
  {
    slug: "lumen-health",
    company: "Lumen Health",
    category: "Support",
    persona: "Lina Vargas",
    role: "Head of support",
    outcome: "47 percent fewer escalations",
    story:
      "Triage, policy checks, and approval gates captured in plain text. The bot and the on-call read the same triage map.",
    useCaseSlug: "support-operations",
  },
  {
    slug: "arc-systems",
    company: "Arc Systems",
    category: "Engineering",
    persona: "Theo Hartmann",
    role: "Tech lead",
    outcome: "RFC review in one sitting",
    story:
      "Architecture and implementation share one map. Reviewers correct the graph instead of arguing about a deck.",
    useCaseSlug: "technical-system-design",
  },
  {
    slug: "glasshouse-studio",
    company: "Glasshouse Studio",
    category: "Sales",
    persona: "Olivia Chen",
    role: "Principal consultant",
    outcome: "Hand off a token, not a PDF",
    story:
      "Clients receive a transferable system with versions, notes, and a protocol endpoint their agent can read.",
    useCaseSlug: "agency-handoff",
  },
  {
    slug: "praxis-labs",
    company: "Praxis Labs",
    category: "Data",
    persona: "Ravi Kumar",
    role: "Data infrastructure engineer",
    outcome: "11 pipelines on one diagram",
    story:
      "Ingestion, enrichment, and audit checkpoints sit on one map. The data lead reviews the graph during standup.",
    useCaseSlug: null,
  },
  {
    slug: "helio-freight",
    company: "Helio Freight",
    category: "Operations",
    persona: "Sara Ito",
    role: "Engineering manager",
    outcome: "On-call onboarding in one hour",
    story:
      "New on-calls read the system before they read the runbook. The graph is the runbook for the agent stack.",
    useCaseSlug: null,
  },
  {
    slug: "sable-index",
    company: "Sable Index",
    category: "Data",
    persona: "Henry Volkov",
    role: "Quant infra lead",
    outcome: "Same map for humans and agents",
    story:
      "Research, ranking, and execution agents read one schema. The audit team reads the same map for compliance.",
    useCaseSlug: null,
  },
  {
    slug: "ferrous-cloud",
    company: "Ferrous Cloud",
    category: "Engineering",
    persona: "Priya Iyer",
    role: "Principal engineer",
    outcome: "From 4 docs to 1 graph",
    story:
      "Four scattered architecture docs collapsed into one map the team edits in conversation. Reviewers correct it, not redraw it.",
    useCaseSlug: "technical-system-design",
  },
  {
    slug: "maritime-signal",
    company: "Maritime Signal",
    category: "Operations",
    persona: "Jonas Ek",
    role: "Reliability lead",
    outcome: "Incident sketches in 5 minutes",
    story:
      "Sev-1 timelines drawn as a graph during the call. Postmortems start with the map, not a blank doc.",
    useCaseSlug: null,
  },
  {
    slug: "tessera-bank",
    company: "Tessera Bank",
    category: "Engineering",
    persona: "Aiko Tanaka",
    role: "Senior engineer",
    outcome: "Compliance reviewed the graph",
    story:
      "Risk and compliance read the same map the engineers ship. No translation layer between the agent stack and the audit binder.",
    useCaseSlug: null,
  },
  {
    slug: "kestrel-audit",
    company: "Kestrel Audit",
    category: "Sales",
    persona: "Marcus Lee",
    role: "Customer engineer",
    outcome: "Customer demos in plain English",
    story:
      "Prospects describe their stack in a sentence. The agent draws it. The deal moves before the demo ends.",
    useCaseSlug: "agency-handoff",
  },
];

export const featuredQuote: FeaturedQuote = {
  body:
    "We stopped drawing systems. We describe them. The agent draws them. The team reads the same map our fleet runs against.",
  persona: "Maya Reyes",
  role: "Staff engineer",
  company: "Northwind Robotics",
};
