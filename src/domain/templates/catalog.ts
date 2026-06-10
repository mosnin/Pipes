export type TemplateParameter = {
  key: string;
  label: string;
  description: string;
  defaultValue?: string;
  required?: boolean;
  appliesTo?: string[]; // node IDs that this param applies to
  field?: "title" | "description"; // which node field to substitute
};

export type StarterTemplate = {
  id: string;
  title: string;
  description: string;
  category: string;
  useCase: string;
  complexity: "simple" | "standard" | "advanced";
  parameters?: TemplateParameter[];
  nodes: Array<{ id: string; type: string; title: string; description?: string; x: number; y: number }>;
  pipes: Array<{ fromNodeId: string; toNodeId: string }>;
};

export const starterTemplates: StarterTemplate[] = [
  {
    id: "multi-agent-handoff",
    title: "Multi-agent Handoff",
    description: "A planner agent hands off to an executor agent through a guard step.",
    category: "Engineering",
    useCase: "Planner hands off to executor with a guard between them.",
    complexity: "standard",
    parameters: [
      { key: "planner_role", label: "Planner role", description: "What does the planner agent decide?", defaultValue: "breaks the request into steps", field: "description", appliesTo: ["planner"] },
      { key: "executor_role", label: "Executor role", description: "What does the executor agent run?", defaultValue: "runs each step against the tools", field: "description", appliesTo: ["executor"] }
    ],
    nodes: [
      { id: "input", type: "Node", title: "Inbound request", description: "Captures the request that starts the run.", x: 100, y: 200 },
      { id: "planner", type: "Node", title: "Planner agent", description: "Reads the request and {{planner_role}}.", x: 340, y: 200 },
      { id: "guard", type: "Node", title: "Plan guard", description: "Checks the plan against policy before execution.", x: 580, y: 200 },
      { id: "executor", type: "Node", title: "Executor agent", description: "Receives the approved plan and {{executor_role}}.", x: 820, y: 200 },
      { id: "output", type: "Node", title: "Run report", description: "Returns the executor result with the plan trail.", x: 1060, y: 200 }
    ],
    pipes: [
      { fromNodeId: "input", toNodeId: "planner" },
      { fromNodeId: "planner", toNodeId: "guard" },
      { fromNodeId: "guard", toNodeId: "executor" },
      { fromNodeId: "executor", toNodeId: "output" }
    ]
  },
  {
    id: "multi-agent-research",
    title: "Multi-agent Research",
    description: "A planner, a retriever, and a synthesizer hand off through one contract.",
    category: "Research",
    useCase: "A research team coordinates a planner, retriever, and synthesizer.",
    complexity: "advanced",
    parameters: [
      { key: "research_domain", label: "Research domain", description: "Which domain does this research system cover?", defaultValue: "general", appliesTo: ["plan", "synth"] }
    ],
    nodes: [
      { id: "in", type: "Node", title: "Research question", description: "Inbound research question or topic.", x: 100, y: 200 },
      { id: "plan", type: "Node", title: "Planner agent", description: "Breaks the question into a research plan.", x: 340, y: 120 },
      { id: "research", type: "Node", title: "Retriever tool", description: "Fetches sources matching the plan.", x: 340, y: 280 },
      { id: "synth", type: "Node", title: "Synthesizer agent", description: "Combines retrieved evidence into a draft.", x: 600, y: 200 },
      { id: "out", type: "Node", title: "Research brief", description: "Returns a structured research brief.", x: 860, y: 200 }
    ],
    pipes: [
      { fromNodeId: "in", toNodeId: "plan" },
      { fromNodeId: "in", toNodeId: "research" },
      { fromNodeId: "plan", toNodeId: "synth" },
      { fromNodeId: "research", toNodeId: "synth" },
      { fromNodeId: "synth", toNodeId: "out" }
    ]
  },
  {
    id: "automation-workflow",
    title: "Event Automation",
    description: "Trigger fires. Decision routes. Action runs.",
    category: "Operations",
    useCase: "An ops team turns inbound events into routed actions.",
    complexity: "standard",
    parameters: [
      { key: "trigger_event", label: "Trigger event name", description: "Name of the event that starts this run", defaultValue: "user.action", appliesTo: ["trigger"] },
      { key: "action_name", label: "Action label", description: "What action runs at the end?", defaultValue: "Run action", appliesTo: ["action"], field: "title" }
    ],
    nodes: [
      { id: "trigger", type: "Node", title: "Event trigger", description: "Fires when {{trigger_event}} arrives.", x: 100, y: 160 },
      { id: "decision", type: "Node", title: "Rule decision", description: "Routes the event to the right action.", x: 340, y: 160 },
      { id: "action", type: "Node", title: "Run action", description: "Runs the matched action.", x: 580, y: 160 },
      { id: "output", type: "Node", title: "Run report", description: "Records the outcome of the run.", x: 820, y: 160 }
    ],
    pipes: [
      { fromNodeId: "trigger", toNodeId: "decision" },
      { fromNodeId: "decision", toNodeId: "action" },
      { fromNodeId: "action", toNodeId: "output" }
    ]
  },
  {
    id: "support-ops-system",
    title: "Support Ops Flow",
    description: "A support ops team classifies tickets, runs guardrails, and escalates.",
    category: "Support",
    useCase: "Support ops classifies, guards, and escalates inbound tickets.",
    complexity: "standard",
    parameters: [
      { key: "team_name", label: "Team name", description: "The support team that owns escalations", defaultValue: "Support Team", appliesTo: ["approval"] }
    ],
    nodes: [
      { id: "input", type: "Node", title: "Ticket intake", description: "Receives the inbound support ticket.", x: 100, y: 160 },
      { id: "classifier", type: "Node", title: "Ticket classifier", description: "Tags the ticket and detects intent.", x: 320, y: 160 },
      { id: "guardrail", type: "Node", title: "Policy check", description: "Runs PII and policy guardrails on the response.", x: 560, y: 160 },
      { id: "approval", type: "Node", title: "Escalation review", description: "Routes high-risk tickets to {{team_name}}.", x: 800, y: 160 },
      { id: "out", type: "Node", title: "Final resolution", description: "Sends the resolution back to the customer.", x: 1040, y: 160 }
    ],
    pipes: [
      { fromNodeId: "input", toNodeId: "classifier" },
      { fromNodeId: "classifier", toNodeId: "guardrail" },
      { fromNodeId: "guardrail", toNodeId: "approval" },
      { fromNodeId: "approval", toNodeId: "out" }
    ]
  },
  {
    id: "customer-support-triage",
    title: "Customer Support Triage",
    description: "A support team triages inbound tickets before a human ever sees them.",
    category: "Support",
    useCase: "Inbound tickets get triaged before a human ever sees them.",
    complexity: "standard",
    parameters: [
      { key: "kb_url", label: "Knowledge base URL", description: "Base URL of the knowledge base used for answer lookup", defaultValue: "https://kb.example.com", appliesTo: ["kb"] },
      { key: "confidence_threshold", label: "Confidence threshold", description: "Minimum confidence to auto-resolve a ticket", defaultValue: "0.8" }
    ],
    nodes: [
      { id: "ticket", type: "Node", title: "Inbound ticket", description: "Captures a new ticket from email, chat, or form.", x: 100, y: 220 },
      { id: "intent", type: "Node", title: "Intent classifier", description: "Predicts intent and tags from the ticket text.", x: 340, y: 220 },
      { id: "kb", type: "Node", title: "Knowledge base lookup", description: "Searches {{kb_url}} for matching articles.", x: 580, y: 220 },
      { id: "confidence", type: "Node", title: "Confidence check", description: "Branches on whether the answer clears the threshold.", x: 820, y: 220 },
      { id: "specialist", type: "Node", title: "Specialist queue", description: "Routes complex tickets to the right human queue.", x: 1060, y: 120 },
      { id: "auto", type: "Node", title: "Auto-resolved reply", description: "Sends the verified self-serve reply to the customer.", x: 1060, y: 320 },
      { id: "escalation", type: "Node", title: "Escalation handoff", description: "Hands off context-rich cases to senior support.", x: 1300, y: 220 }
    ],
    pipes: [
      { fromNodeId: "ticket", toNodeId: "intent" },
      { fromNodeId: "intent", toNodeId: "kb" },
      { fromNodeId: "kb", toNodeId: "confidence" },
      { fromNodeId: "confidence", toNodeId: "specialist" },
      { fromNodeId: "confidence", toNodeId: "auto" },
      { fromNodeId: "specialist", toNodeId: "escalation" },
      { fromNodeId: "auto", toNodeId: "escalation" }
    ]
  },
  {
    id: "sales-lead-qualifier",
    title: "Sales Lead Qualifier",
    description: "A sales engineering team enriches, qualifies, and tiers inbound leads.",
    category: "Sales",
    useCase: "Inbound leads are enriched, qualified, and tiered before the CRM write.",
    complexity: "standard",
    parameters: [
      { key: "crm_endpoint", label: "CRM endpoint", description: "API endpoint that receives qualified leads", defaultValue: "https://crm.example.com/api/leads", appliesTo: ["crm"] },
      { key: "hot_lead_channel", label: "Hot lead channel", description: "Slack channel for hot lead alerts", defaultValue: "#sales-hot-leads", appliesTo: ["alert"] }
    ],
    nodes: [
      { id: "intake", type: "Node", title: "Lead form intake", description: "Receives a new lead from the marketing site.", x: 100, y: 200 },
      { id: "enrich", type: "Node", title: "Enrichment lookup", description: "Adds firmographic and contact data from external providers.", x: 340, y: 200 },
      { id: "bant", type: "Node", title: "BANT qualifier", description: "Scores budget, authority, need, and timeline.", x: 580, y: 200 },
      { id: "tier", type: "Node", title: "Tier classifier", description: "Assigns hot, warm, or cold tier from the BANT score.", x: 820, y: 200 },
      { id: "alert", type: "Node", title: "Hot lead alert", description: "Notifies {{hot_lead_channel}} for hot leads.", x: 1060, y: 100 },
      { id: "crm", type: "Node", title: "CRM record write", description: "Creates or updates the lead at {{crm_endpoint}}.", x: 1060, y: 300 }
    ],
    pipes: [
      { fromNodeId: "intake", toNodeId: "enrich" },
      { fromNodeId: "enrich", toNodeId: "bant" },
      { fromNodeId: "bant", toNodeId: "tier" },
      { fromNodeId: "tier", toNodeId: "alert" },
      { fromNodeId: "tier", toNodeId: "crm" }
    ]
  },
  {
    id: "code-review-assistant",
    title: "Code Review Assistant",
    description: "An engineering team runs lint, security, and style reviews and posts one PR comment.",
    category: "Engineering",
    useCase: "Engineering runs lint, security, and style checks on every PR.",
    complexity: "advanced",
    parameters: [
      { key: "model_name", label: "Reviewer model", description: "LLM the review agents use", defaultValue: "gpt-4.1-mini", appliesTo: ["lint", "security", "style", "aggregator"] },
      { key: "repo", label: "Repository", description: "Repository this assistant reviews", defaultValue: "owner/repo", appliesTo: ["webhook"] }
    ],
    nodes: [
      { id: "webhook", type: "Node", title: "PR opened webhook", description: "Receives pull_request events from {{repo}}.", x: 100, y: 220 },
      { id: "diff", type: "Node", title: "Diff fetcher", description: "Pulls the unified diff and changed file list.", x: 340, y: 220 },
      { id: "lint", type: "Node", title: "Linter review", description: "Runs static analysis with {{model_name}}.", x: 580, y: 100 },
      { id: "security", type: "Node", title: "Security scan", description: "Detects unsafe patterns and dependency risks.", x: 580, y: 220 },
      { id: "style", type: "Node", title: "Style critique", description: "Reviews readability, naming, and conventions.", x: 580, y: 340 },
      { id: "aggregator", type: "Node", title: "Review aggregator", description: "Merges all findings into a structured summary.", x: 840, y: 220 },
      { id: "comment", type: "Node", title: "Comment poster", description: "Posts the consolidated review back to the PR.", x: 1100, y: 220 }
    ],
    pipes: [
      { fromNodeId: "webhook", toNodeId: "diff" },
      { fromNodeId: "diff", toNodeId: "lint" },
      { fromNodeId: "diff", toNodeId: "security" },
      { fromNodeId: "diff", toNodeId: "style" },
      { fromNodeId: "lint", toNodeId: "aggregator" },
      { fromNodeId: "security", toNodeId: "aggregator" },
      { fromNodeId: "style", toNodeId: "aggregator" },
      { fromNodeId: "aggregator", toNodeId: "comment" }
    ]
  },
  {
    id: "document-qa-system",
    title: "Document QA",
    description: "A knowledge team answers questions over a corpus with retrieved context and citations.",
    category: "Knowledge",
    useCase: "User questions are answered over a corpus with inline citations.",
    complexity: "standard",
    parameters: [
      { key: "index_name", label: "Vector index", description: "Vector index to query", defaultValue: "docs-prod", appliesTo: ["retriever"] },
      { key: "model_name", label: "Answering model", description: "Model the answering agent uses", defaultValue: "gpt-4.1-mini", appliesTo: ["answer"] }
    ],
    nodes: [
      { id: "question", type: "Node", title: "User question", description: "Inbound natural-language question from the user.", x: 100, y: 180 },
      { id: "retriever", type: "Node", title: "Vector retriever", description: "Searches {{index_name}} for matching chunks.", x: 340, y: 180 },
      { id: "assembler", type: "Node", title: "Context assembler", description: "Builds an answer prompt from the retrieved chunks.", x: 580, y: 180 },
      { id: "answer", type: "Node", title: "Answering agent", description: "Writes a grounded answer with {{model_name}}.", x: 820, y: 180 },
      { id: "citations", type: "Node", title: "Citation formatter", description: "Attaches inline citations to the answer.", x: 1060, y: 180 },
      { id: "response", type: "Node", title: "Final response", description: "Returns the cited answer to the user.", x: 1300, y: 180 }
    ],
    pipes: [
      { fromNodeId: "question", toNodeId: "retriever" },
      { fromNodeId: "retriever", toNodeId: "assembler" },
      { fromNodeId: "assembler", toNodeId: "answer" },
      { fromNodeId: "answer", toNodeId: "citations" },
      { fromNodeId: "citations", toNodeId: "response" }
    ]
  },
  {
    id: "content-moderation-pipeline",
    title: "Content Moderation",
    description: "A trust and safety team classifies submissions, routes by severity, and logs every decision.",
    category: "Trust & Safety",
    useCase: "Trust and safety routes user submissions by severity and audits each call.",
    complexity: "standard",
    parameters: [
      { key: "policy_version", label: "Policy version", description: "Active moderation policy version", defaultValue: "v3.2", appliesTo: ["classifier"] }
    ],
    nodes: [
      { id: "submission", type: "Node", title: "User submission", description: "Captures any user-generated content for review.", x: 100, y: 220 },
      { id: "classifier", type: "Node", title: "Policy classifier", description: "Scores the submission against {{policy_version}} categories.", x: 340, y: 220 },
      { id: "router", type: "Node", title: "Severity router", description: "Routes by severity into low, medium, or high lanes.", x: 580, y: 220 },
      { id: "block", type: "Node", title: "Auto-block action", description: "Blocks high-severity violations immediately.", x: 840, y: 100 },
      { id: "shadow", type: "Node", title: "Shadow flag", description: "Hides medium-severity content pending review.", x: 840, y: 220 },
      { id: "human", type: "Node", title: "Human review queue", description: "Queues edge cases for trained human moderators.", x: 840, y: 340 },
      { id: "audit", type: "Node", title: "Audit log writer", description: "Persists every decision for compliance and appeals.", x: 1100, y: 220 }
    ],
    pipes: [
      { fromNodeId: "submission", toNodeId: "classifier" },
      { fromNodeId: "classifier", toNodeId: "router" },
      { fromNodeId: "router", toNodeId: "block" },
      { fromNodeId: "router", toNodeId: "shadow" },
      { fromNodeId: "router", toNodeId: "human" },
      { fromNodeId: "block", toNodeId: "audit" },
      { fromNodeId: "shadow", toNodeId: "audit" },
      { fromNodeId: "human", toNodeId: "audit" }
    ]
  },
  {
    id: "meeting-coordinator",
    title: "Meeting Coordinator",
    description: "An ops team resolves calendar conflicts and proposes a time the requester can confirm.",
    category: "Operations",
    useCase: "Inbound meeting requests get a conflict-free time the requester can confirm.",
    complexity: "simple",
    parameters: [
      { key: "calendar_id", label: "Calendar ID", description: "Calendar to read availability from", defaultValue: "primary", appliesTo: ["calendar"] }
    ],
    nodes: [
      { id: "request", type: "Node", title: "Meeting request", description: "Inbound request with attendees and a window.", x: 100, y: 160 },
      { id: "calendar", type: "Node", title: "Calendar reader", description: "Reads availability from {{calendar_id}}.", x: 340, y: 160 },
      { id: "resolver", type: "Node", title: "Conflict resolver", description: "Picks slots without overlap and respects working hours.", x: 580, y: 160 },
      { id: "slot", type: "Node", title: "Proposed slot", description: "Composes a meeting time and agenda.", x: 820, y: 160 },
      { id: "confirm", type: "Node", title: "Confirmation sender", description: "Sends the invite and waits for acceptance.", x: 1060, y: 160 }
    ],
    pipes: [
      { fromNodeId: "request", toNodeId: "calendar" },
      { fromNodeId: "calendar", toNodeId: "resolver" },
      { fromNodeId: "resolver", toNodeId: "slot" },
      { fromNodeId: "slot", toNodeId: "confirm" }
    ]
  },
  {
    id: "data-extraction-pipeline",
    title: "Data Extraction",
    description: "A data team turns uploaded documents into validated records with a dead-letter for failures.",
    category: "Data",
    useCase: "Uploaded documents become validated records, with a dead-letter for failures.",
    complexity: "standard",
    parameters: [
      { key: "schema_name", label: "Target schema", description: "Schema the extracted record must match", defaultValue: "invoice_v2", appliesTo: ["validator"] },
      { key: "ocr_engine", label: "OCR engine", description: "OCR backend to use", defaultValue: "tesseract", appliesTo: ["ocr"] }
    ],
    nodes: [
      { id: "upload", type: "Node", title: "Document upload", description: "Receives a PDF or image from the user.", x: 100, y: 200 },
      { id: "ocr", type: "Node", title: "OCR engine", description: "Runs {{ocr_engine}} to extract raw text.", x: 340, y: 200 },
      { id: "extractor", type: "Node", title: "Field extractor", description: "Pulls structured fields from the OCR output.", x: 580, y: 200 },
      { id: "validator", type: "Node", title: "Schema validator", description: "Validates the record against {{schema_name}}.", x: 820, y: 200 },
      { id: "record", type: "Node", title: "Structured record", description: "Persists the validated record to storage.", x: 1060, y: 100 },
      { id: "dlq", type: "Node", title: "Failure dead-letter", description: "Captures failed extractions for retry.", x: 1060, y: 300 }
    ],
    pipes: [
      { fromNodeId: "upload", toNodeId: "ocr" },
      { fromNodeId: "ocr", toNodeId: "extractor" },
      { fromNodeId: "extractor", toNodeId: "validator" },
      { fromNodeId: "validator", toNodeId: "record" },
      { fromNodeId: "validator", toNodeId: "dlq" }
    ]
  },
  {
    id: "research-deep-dive",
    title: "Research Deep Dive",
    description: "A research team plans a multi-source investigation, synthesizes, and fact-checks the result.",
    category: "Research",
    useCase: "Research is planned across web, papers, and internal data, then fact-checked.",
    complexity: "advanced",
    parameters: [
      { key: "model_name", label: "Synthesis model", description: "Model used for synthesis and fact checking", defaultValue: "gpt-4.1-mini", appliesTo: ["synth", "fact"] }
    ],
    nodes: [
      { id: "topic", type: "Node", title: "Topic question", description: "Inbound topic or open question.", x: 100, y: 240 },
      { id: "planner", type: "Node", title: "Research planner", description: "Writes a search plan across sources.", x: 340, y: 240 },
      { id: "web", type: "Node", title: "Web search", description: "Searches the open web for recent context.", x: 580, y: 100 },
      { id: "papers", type: "Node", title: "Paper search", description: "Queries academic databases for peer-reviewed sources.", x: 580, y: 240 },
      { id: "db", type: "Node", title: "Database lookup", description: "Pulls structured facts from internal databases.", x: 580, y: 380 },
      { id: "synth", type: "Node", title: "Synthesizer", description: "Drafts a brief from the combined evidence.", x: 840, y: 240 },
      { id: "fact", type: "Node", title: "Fact checker", description: "Verifies key claims against the cited sources.", x: 1100, y: 240 },
      { id: "brief", type: "Node", title: "Final brief", description: "Returns a fact-checked, source-linked brief.", x: 1360, y: 240 }
    ],
    pipes: [
      { fromNodeId: "topic", toNodeId: "planner" },
      { fromNodeId: "planner", toNodeId: "web" },
      { fromNodeId: "planner", toNodeId: "papers" },
      { fromNodeId: "planner", toNodeId: "db" },
      { fromNodeId: "web", toNodeId: "synth" },
      { fromNodeId: "papers", toNodeId: "synth" },
      { fromNodeId: "db", toNodeId: "synth" },
      { fromNodeId: "synth", toNodeId: "fact" },
      { fromNodeId: "fact", toNodeId: "brief" }
    ]
  },
  {
    id: "onboarding-orchestrator",
    title: "New Hire Runbook",
    description: "A People Ops team runs the new-hire checklist from provisioning through manager handoff.",
    category: "HR",
    useCase: "New hires are provisioned, welcomed, and handed to their manager on day one.",
    complexity: "standard",
    parameters: [
      { key: "hris_system", label: "HRIS system", description: "Source HRIS that emits new hire signals", defaultValue: "Workday", appliesTo: ["signal"] },
      { key: "welcome_template", label: "Welcome template", description: "Email template ID for the welcome packet", defaultValue: "welcome_v4", appliesTo: ["packet"] }
    ],
    nodes: [
      { id: "signal", type: "Node", title: "New hire signal", description: "Fires when {{hris_system}} confirms a hire.", x: 100, y: 200 },
      { id: "checklist", type: "Node", title: "Provisioning checklist", description: "Builds the full provisioning task list.", x: 340, y: 200 },
      { id: "access", type: "Node", title: "Access request", description: "Creates accounts and access tickets across systems.", x: 580, y: 200 },
      { id: "packet", type: "Node", title: "Welcome packet", description: "Sends the {{welcome_template}} welcome email.", x: 820, y: 200 },
      { id: "manager", type: "Node", title: "Manager handoff", description: "Notifies the manager and shares first-week goals.", x: 1060, y: 200 },
      { id: "summary", type: "Node", title: "Day-one summary", description: "Posts a day-one readiness summary to People Ops.", x: 1300, y: 200 }
    ],
    pipes: [
      { fromNodeId: "signal", toNodeId: "checklist" },
      { fromNodeId: "checklist", toNodeId: "access" },
      { fromNodeId: "access", toNodeId: "packet" },
      { fromNodeId: "packet", toNodeId: "manager" },
      { fromNodeId: "manager", toNodeId: "summary" }
    ]
  },
  {
    id: "incident-response-runbook",
    title: "Incident Response Runbook",
    description: "An on-call team pages, runs the right runbook, drives the response, and drafts the post-mortem.",
    category: "Operations",
    useCase: "On-call pages, runs the runbook, drives the response, and drafts a post-mortem.",
    complexity: "advanced",
    parameters: [
      { key: "pagerduty_service", label: "PagerDuty service", description: "Service ID that pages on-call", defaultValue: "PXXXXXX", appliesTo: ["pager"] },
      { key: "runbook_repo", label: "Runbook repo", description: "Repository hosting the runbook library", defaultValue: "ops/runbooks", appliesTo: ["runbook"] }
    ],
    nodes: [
      { id: "alert", type: "Node", title: "Alert webhook", description: "Receives the inbound monitoring alert.", x: 100, y: 220 },
      { id: "severity", type: "Node", title: "Severity classifier", description: "Assigns SEV1 through SEV4 from the signal.", x: 340, y: 220 },
      { id: "pager", type: "Node", title: "On-call pager", description: "Pages the rotation on {{pagerduty_service}}.", x: 600, y: 100 },
      { id: "runbook", type: "Node", title: "Runbook lookup", description: "Fetches the matching runbook from {{runbook_repo}}.", x: 600, y: 340 },
      { id: "executor", type: "Node", title: "Executor agent", description: "Runs the runbook steps with operator approvals.", x: 860, y: 220 },
      { id: "status", type: "Node", title: "Status updates", description: "Posts incident status updates to stakeholders.", x: 1120, y: 220 },
      { id: "postmortem", type: "Node", title: "Post-mortem draft", description: "Drafts the post-mortem from the action timeline.", x: 1380, y: 220 }
    ],
    pipes: [
      { fromNodeId: "alert", toNodeId: "severity" },
      { fromNodeId: "severity", toNodeId: "pager" },
      { fromNodeId: "severity", toNodeId: "runbook" },
      { fromNodeId: "pager", toNodeId: "executor" },
      { fromNodeId: "runbook", toNodeId: "executor" },
      { fromNodeId: "executor", toNodeId: "status" },
      { fromNodeId: "status", toNodeId: "postmortem" }
    ]
  }
];
