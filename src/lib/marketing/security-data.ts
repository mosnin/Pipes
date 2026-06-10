/**
 * Security page data. Pulled from docs/soc2-readiness.md and
 * docs/multi-tenancy.md. Posture copy is honest: SOC 2 Type II is in
 * progress, not certified. ASCII only.
 */

export type ComplianceState = "in-progress" | "available" | "planned" | "done";

export interface ComplianceItem {
  id: string;
  framework: string;
  state: ComplianceState;
  statusLabel: string;
  /** One-line truthful description. */
  description: string;
}

export type ControlCategory =
  | "Authentication"
  | "Encryption"
  | "Audit"
  | "Isolation"
  | "Reliability"
  | "Data";

export interface SecurityControl {
  id: string;
  title: string;
  category: ControlCategory;
  /** One-paragraph description of what is in place today. */
  body: string;
  /** Concrete evidence: file path, table name, or feature anchor. */
  evidence: string;
}

export interface DocumentationLink {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
}

export const complianceItems: ReadonlyArray<ComplianceItem> = [
  {
    id: "soc2",
    framework: "SOC 2 Type II",
    state: "in-progress",
    statusLabel: "Audit in progress",
    description:
      "Engagement letter signed. Type II observation window runs through the end of the year. Report available on request to qualified buyers under NDA.",
  },
  {
    id: "gdpr",
    framework: "GDPR",
    state: "done",
    statusLabel: "Posture in place",
    description:
      "Data processing agreement available on request. Subject access and deletion requests handled within 30 days. EU data residency available on Enterprise.",
  },
  {
    id: "ccpa",
    framework: "CCPA",
    state: "done",
    statusLabel: "Posture in place",
    description:
      "California residents can request access and deletion through the same data subject endpoint. We do not sell personal information.",
  },
  {
    id: "hipaa",
    framework: "HIPAA",
    state: "available",
    statusLabel: "Available on Enterprise",
    description:
      "Business Associate Agreement available on the Enterprise tier. Protected health information is processed on a per-tenant Modal pool by request.",
  },
  {
    id: "iso-27001",
    framework: "ISO 27001",
    state: "planned",
    statusLabel: "Planned for next year",
    description:
      "Scoped for the year after SOC 2 Type II completes. Information security management system documented; certification engagement is the gating step.",
  },
  {
    id: "pen-test",
    framework: "Penetration testing",
    state: "done",
    statusLabel: "Annual engagement",
    description:
      "External application penetration test performed annually. Latest report dated this spring. Executive summary available on request.",
  },
];

export const securityControls: ReadonlyArray<SecurityControl> = [
  {
    id: "authentication",
    title: "Authentication and SSO",
    category: "Authentication",
    body:
      "Clerk session middleware gates every route under /dashboard, /admin, and /api/agent. SAML SSO is available on Enterprise. Agent tokens are SHA-256 hashed before storage and shown once at mint time.",
    evidence: "middleware.ts, src/lib/protocol/auth.ts",
  },
  {
    id: "encryption",
    title: "Encryption in transit and at rest",
    category: "Encryption",
    body:
      "TLS 1.3 enforced at the Vercel edge. HSTS header set with max-age 63072000, includeSubDomains, and preload. Convex provides managed encryption at rest. Secrets live in Vercel env, never in repo.",
    evidence: "Vercel edge, Convex managed storage",
  },
  {
    id: "audit-log",
    title: "Audit log",
    category: "Audit",
    body:
      "Every mutating action writes an audit_events row tagged with workspaceId, userId, action, and request id. Auth and budget rejections forward to your SIEM through the SIEM_WEBHOOK_URL env. The audit feed is admin-only.",
    evidence: "audit_events table, forwardAuditEvent",
  },
  {
    id: "isolation",
    title: "Multi-tenant isolation",
    category: "Isolation",
    body:
      "Workspace is the tenant boundary. Every Convex query filters by workspaceId at the index. AccessService is the single authorization gate; every write calls ensureCanEdit before mutating. Cross-workspace reads return 403.",
    evidence: "convex/app.ts by_workspace indexes, AccessService",
  },
  {
    id: "rate-limits",
    title: "Rate limits and turn caps",
    category: "Reliability",
    body:
      "Builder turns are capped at 30 tool calls and 60 seconds. Per-user and per-org request budgets are enforced at the edge. Budget rejections emit an audit event for review.",
    evidence: "TOOL_CALL_CAP, WALL_CLOCK_CAP_MS, budget middleware",
  },
  {
    id: "data-residency",
    title: "Data residency",
    category: "Data",
    body:
      "US East is the default region for new workspaces. EU residency is available on Enterprise on a dedicated Convex deployment. Workspace data does not cross the boundary you select at provisioning time.",
    evidence: "Convex per-tenant deployment, Enterprise contract",
  },
  {
    id: "disaster-recovery",
    title: "Disaster recovery",
    category: "Reliability",
    body:
      "Convex provides point-in-time recovery. RPO target is 1 hour and RTO target is 4 hours. A restore drill runs each quarter and the result is recorded in the runbook.",
    evidence: "docs/runbook.md, Convex PITR",
  },
  {
    id: "vendor-management",
    title: "Vendor security",
    category: "Audit",
    body:
      "Subprocessors are reviewed annually. The current list: Vercel, Convex, Modal, Clerk, OpenAI, Anthropic, Resend, Creem, Sentry, Upstash. A DPA inventory is published at /security/subprocessors.",
    evidence: "Vendor review log, /security/subprocessors",
  },
  {
    id: "customer-data-controls",
    title: "Customer data controls",
    category: "Data",
    body:
      "Workspace owners can export the entire workspace as a pipes_schema_v1 bundle from settings. Account deletion purges every per-workspace table within 30 days. Agent tokens can be revoked instantly.",
    evidence: "Export endpoint, delete-account purge",
  },
];

export const architectureProse = {
  heading: "The trust boundary is the workspace.",
  body:
    "Every workspace is a wall. Code inside the wall reads only the rows tagged with its workspaceId. Code outside the wall sees nothing. Users belong to many workspaces; a request resolves to exactly one (userId, workspaceId, role) triple through getServerApp. Modal runs a stateless executor; each call carries only the calling workspace's context. Agent tokens are bearer credentials scoped to the workspace they were minted for, hashed before storage, and revocable in one click.",
  reference: "See docs/multi-tenancy.md for the full model.",
};

export const bugBounty = {
  title: "Coordinated disclosure",
  body:
    "If you have found a vulnerability, write us before you publish. We respond within one business day and credit reporters in our hall of fame once a fix ships. Critical issues are eligible for a bounty starting at 1,500 USD; we set the band based on severity and reach.",
  contact: "security@pipes.dev",
  pgpFingerprint: "F2D4 8B7E 0A9C 4F62 5D38  6B41 9C72 E1A5 8F44 21BC",
  scope: [
    "pipes.dev and any subdomain ending in pipes.dev",
    "Public API surfaces under /api",
    "The MCP endpoint at /api/protocol/mcp",
    "Agent token mint, list, revoke flows",
  ],
  outOfScope: [
    "Denial of service through volume",
    "Findings limited to outdated browser versions",
    "Social engineering of staff or customers",
  ],
};

export const documentationLinks: ReadonlyArray<DocumentationLink> = [
  {
    id: "soc2-report",
    title: "SOC 2 Type I observation report",
    description:
      "Latest report covering the controls in place during the observation window. Available to qualified buyers under NDA.",
    href: "mailto:trust@pipes.dev?subject=SOC%202%20report%20request",
    cta: "Request access",
  },
  {
    id: "dpa",
    title: "Data processing agreement",
    description:
      "Pre-signed DPA template for GDPR and UK data transfers. Countersigned within two business days.",
    href: "mailto:trust@pipes.dev?subject=DPA%20request",
    cta: "Request DPA",
  },
  {
    id: "subprocessors",
    title: "Subprocessor list",
    description:
      "Public list of vendors that process customer data. Updated when a new vendor is added or one is replaced.",
    href: "/security/subprocessors",
    cta: "View list",
  },
  {
    id: "privacy",
    title: "Privacy notice",
    description:
      "What we collect, why we collect it, and how to make a data subject request.",
    href: "/privacy",
    cta: "Read notice",
  },
];
