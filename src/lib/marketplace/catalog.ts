// Single source of truth for marketplace listings.
//
// Both the marketing gallery (display) and the import route (authoritative
// price + which starter template to instantiate) read from here, so listing
// ids never drift between what the user sees and what the server charges for.

export type MarketplaceListing = {
  id: string;
  title: string;
  description: string;
  category: "Research" | "Support" | "Code" | "Sales" | "Data" | "Content" | "Security" | "DevOps";
  creator: { name: string; handle: string; verified: boolean };
  price: number; // 0 = free
  installCount: number;
  rating: number;
  ratingCount: number;
  tags: string[];
  complexity: "simple" | "standard" | "advanced";
  // The starter template instantiated on import. Always a valid catalog id.
  templateId: string;
};

export const MARKETPLACE_LISTINGS: MarketplaceListing[] = [
  {
    id: "deep-research-loop",
    title: "Deep Research Loop",
    description: "Iterates search, synthesis, and critique until a confidence score passes. Handles source dedup automatically.",
    category: "Research",
    creator: { name: "Alex Chen", handle: "alexc", verified: true },
    price: 0,
    installCount: 4812,
    rating: 4.8,
    ratingCount: 312,
    tags: ["research", "iterative", "reflection"],
    complexity: "standard",
    templateId: "research-deep-dive",
  },
  {
    id: "support-triage-loop",
    title: "Support Triage + Escalation Loop",
    description: "Classifies incoming tickets, attempts auto-resolution, and escalates to human review when confidence is low.",
    category: "Support",
    creator: { name: "Priya Nair", handle: "priyan", verified: true },
    price: 19,
    installCount: 2341,
    rating: 4.7,
    ratingCount: 198,
    tags: ["support", "triage", "HITL", "escalation"],
    complexity: "standard",
    templateId: "customer-support-triage",
  },
  {
    id: "code-review-loop",
    title: "Code Review Loop",
    description: "Multi-pass code review: security scan, style check, logic audit. Loops until all issues are addressed or a human approves.",
    category: "Code",
    creator: { name: "Marcus Webb", handle: "mwebb", verified: false },
    price: 0,
    installCount: 7200,
    rating: 4.9,
    ratingCount: 541,
    tags: ["code", "review", "security", "quality"],
    complexity: "advanced",
    templateId: "code-review-assistant",
  },
  {
    id: "sales-outreach-loop",
    title: "Personalized Outreach Loop",
    description: "Researches a prospect, drafts a personalized message, evaluates it, and retries until tone and relevance scores pass.",
    category: "Sales",
    creator: { name: "Jordan Kim", handle: "jordank", verified: true },
    price: 29,
    installCount: 1890,
    rating: 4.5,
    ratingCount: 134,
    tags: ["sales", "outreach", "personalization"],
    complexity: "standard",
    templateId: "sales-lead-qualifier",
  },
  {
    id: "data-pipeline-loop",
    title: "ETL Quality Loop",
    description: "Validates, transforms, and loads data. Loops on rows that fail validation, logging error classes for downstream review.",
    category: "Data",
    creator: { name: "Sofia Martinez", handle: "sofiam", verified: true },
    price: 0,
    installCount: 3100,
    rating: 4.6,
    ratingCount: 227,
    tags: ["etl", "data", "validation", "pipeline"],
    complexity: "advanced",
    templateId: "data-extraction-pipeline",
  },
  {
    id: "content-draft-loop",
    title: "Draft + Polish Loop",
    description: "Drafts content, scores it against a rubric, self-critiques, and rewrites until the quality threshold is met.",
    category: "Content",
    creator: { name: "Tom Vasquez", handle: "tomv", verified: false },
    price: 0,
    installCount: 5620,
    rating: 4.7,
    ratingCount: 389,
    tags: ["content", "writing", "reflection", "rubric"],
    complexity: "simple",
    templateId: "multi-agent-handoff",
  },
  {
    id: "vulnerability-scan-loop",
    title: "Vulnerability Scan Loop",
    description: "Scans code for vulnerabilities, proposes patches, verifies patches do not break tests, then checkpoints the result.",
    category: "Security",
    creator: { name: "Aisha Okonkwo", handle: "aishao", verified: true },
    price: 49,
    installCount: 920,
    rating: 4.9,
    ratingCount: 76,
    tags: ["security", "vulnerability", "patch", "testing"],
    complexity: "advanced",
    templateId: "code-review-assistant",
  },
  {
    id: "deploy-smoke-loop",
    title: "Deploy + Smoke Test Loop",
    description: "Deploys a service, runs smoke tests, rolls back on failure, and retries with the previous version. Alerts on persistent failures.",
    category: "DevOps",
    creator: { name: "Ben Oduya", handle: "beno", verified: false },
    price: 0,
    installCount: 2780,
    rating: 4.4,
    ratingCount: 203,
    tags: ["devops", "deploy", "smoke-test", "rollback"],
    complexity: "advanced",
    templateId: "automation-workflow",
  },
  {
    id: "customer-feedback-loop",
    title: "Feedback Synthesis Loop",
    description: "Pulls feedback from multiple sources, clusters themes, scores sentiment, and surfaces a weekly digest for human review.",
    category: "Research",
    creator: { name: "Lisa Park", handle: "lisap", verified: true },
    price: 15,
    installCount: 1430,
    rating: 4.6,
    ratingCount: 109,
    tags: ["feedback", "synthesis", "sentiment", "digest"],
    complexity: "standard",
    templateId: "research-deep-dive",
  },
  {
    id: "lead-scoring-loop",
    title: "Lead Scoring Loop",
    description: "Enriches a lead record, scores fit against ICP criteria, and routes high-fit leads to the CRM with a rationale summary.",
    category: "Sales",
    creator: { name: "Carlos Reyes", handle: "carlosr", verified: false },
    price: 0,
    installCount: 3340,
    rating: 4.5,
    ratingCount: 261,
    tags: ["sales", "scoring", "ICP", "CRM"],
    complexity: "standard",
    templateId: "sales-lead-qualifier",
  },
  {
    id: "doc-update-loop",
    title: "Docs Sync Loop",
    description: "Diffs code changes against existing docs, generates update patches, and flags areas where human review is required.",
    category: "Code",
    creator: { name: "Nora Jensen", handle: "noraj", verified: true },
    price: 0,
    installCount: 4100,
    rating: 4.8,
    ratingCount: 302,
    tags: ["docs", "sync", "code", "review"],
    complexity: "simple",
    templateId: "document-qa-system",
  },
  {
    id: "incident-response-loop",
    title: "Incident Response Loop",
    description: "Detects anomaly, escalates to on-call, coordinates a triage agent, and checkpoints each resolution step for audit.",
    category: "DevOps",
    creator: { name: "Ray Ito", handle: "rayito", verified: true },
    price: 39,
    installCount: 670,
    rating: 4.9,
    ratingCount: 58,
    tags: ["devops", "incident", "escalation", "audit"],
    complexity: "advanced",
    templateId: "incident-response-runbook",
  },
];

export function getListing(id: string): MarketplaceListing | undefined {
  return MARKETPLACE_LISTINGS.find((l) => l.id === id);
}
