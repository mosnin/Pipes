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
    id: "single-agent-loop",
    title: "Single Agent Loop",
    description: "Input to agent to output baseline loop.",
    category: "Core",
    useCase: "Assistant baseline",
    complexity: "simple",
    parameters: [
      { key: "agent_role", label: "Agent role", description: "What role should the agent play?", defaultValue: "helpful assistant", field: "description", appliesTo: ["agent"] },
      { key: "system_name", label: "System name", description: "Name for this system", defaultValue: "Single Agent Loop" }
    ],
    nodes: [
      { id: "input", type: "Node", title: "User input", description: "Captures the user request that starts the loop.", x: 120, y: 160 },
      { id: "agent", type: "Node", title: "Reasoning agent", description: "Role: {{agent_role}}", x: 360, y: 160 },
      { id: "output", type: "Node", title: "Response", description: "Returns the final answer to the caller.", x: 620, y: 160 }
    ],
    pipes: [
      { fromNodeId: "input", toNodeId: "agent" },
      { fromNodeId: "agent", toNodeId: "output" }
    ]
  },
  {
    id: "multi-agent-research",
    title: "Multi-agent Research",
    description: "Planner plus researcher plus synthesizer flow.",
    category: "Research",
    useCase: "RAG research orchestration",
    complexity: "advanced",
    parameters: [
      { key: "research_domain", label: "Research domain", description: "What domain does this research system specialize in?", defaultValue: "general", appliesTo: ["plan", "synth"] }
    ],
    nodes: [
      { id: "in", type: "Node", title: "Research question", description: "Inbound research question or topic.", x: 100, y: 200 },
      { id: "plan", type: "Node", title: "Planner agent", description: "Decomposes the question into a research plan.", x: 340, y: 120 },
      { id: "research", type: "Node", title: "Retriever tool", description: "Fetches sources matching the plan.", x: 340, y: 280 },
      { id: "synth", type: "Node", title: "Synthesizer agent", description: "Combines retrieved evidence into a draft.", x: 600, y: 200 },
      { id: "out", type: "Node", title: "Research brief", description: "Final structured research brief.", x: 860, y: 200 }
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
    title: "Automation Workflow",
    description: "Trigger to decision to action automation.",
    category: "Automation",
    useCase: "Ops automation",
    complexity: "standard",
    parameters: [
      { key: "trigger_event", label: "Trigger event name", description: "Name of the event that triggers this workflow", defaultValue: "user.action", appliesTo: ["trigger"] },
      { key: "action_name", label: "Action label", description: "What action is executed?", defaultValue: "Execute action", appliesTo: ["action"], field: "title" }
    ],
    nodes: [
      { id: "trigger", type: "Node", title: "Event trigger", description: "Fires when {{trigger_event}} is observed.", x: 100, y: 160 },
      { id: "decision", type: "Node", title: "Rule decision", description: "Routes the event to the right action branch.", x: 340, y: 160 },
      { id: "action", type: "Node", title: "Execute action", description: "Performs the matched action.", x: 580, y: 160 },
      { id: "output", type: "Node", title: "Execution report", description: "Records the outcome of the workflow.", x: 820, y: 160 }
    ],
    pipes: [
      { fromNodeId: "trigger", toNodeId: "decision" },
      { fromNodeId: "decision", toNodeId: "action" },
      { fromNodeId: "action", toNodeId: "output" }
    ]
  },
  {
    id: "support-ops-system",
    title: "Support Ops System",
    description: "Classify, guardrail, and escalate support flows.",
    category: "Operations",
    useCase: "Support triage",
    complexity: "standard",
    parameters: [
      { key: "team_name", label: "Team name", description: "The support team name for escalations", defaultValue: "Support Team", appliesTo: ["approval"] }
    ],
    nodes: [
      { id: "input", type: "Node", title: "Ticket intake", description: "Receives the inbound support ticket.", x: 100, y: 160 },
      { id: "classifier", type: "Node", title: "Ticket classifier", description: "Categorizes the ticket and detects intent.", x: 320, y: 160 },
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
    description: "Classify inbound tickets, self-serve when confident, and escalate when not.",
    category: "Support",
    useCase: "Customer support automation",
    complexity: "standard",
    parameters: [
      { key: "kb_url", label: "Knowledge base URL", description: "Base URL of the knowledge base used for answer lookup", defaultValue: "https://kb.example.com", appliesTo: ["kb"] },
      { key: "confidence_threshold", label: "Confidence threshold", description: "Minimum confidence to auto-resolve a ticket", defaultValue: "0.8" }
    ],
    nodes: [
      { id: "ticket", type: "Node", title: "Inbound ticket", description: "Captures a new ticket from email, chat, or form.", x: 100, y: 220 },
      { id: "intent", type: "Node", title: "Intent classifier", description: "Predicts intent and tags from the ticket text.", x: 340, y: 220 },
      { id: "kb", type: "Node", title: "Knowledge base lookup", description: "Searches {{kb_url}} for relevant articles.", x: 580, y: 220 },
      { id: "confidence", type: "Node", title: "Confidence check", description: "Branches on whether the suggested answer clears the threshold.", x: 820, y: 220 },
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
    description: "Enrich, qualify, and tier inbound leads before writing to the CRM.",
    category: "Sales",
    useCase: "Sales qualification",
    complexity: "standard",
    parameters: [
      { key: "crm_endpoint", label: "CRM endpoint", description: "API endpoint to write qualified leads to", defaultValue: "https://crm.example.com/api/leads", appliesTo: ["crm"] },
      { key: "hot_lead_channel", label: "Hot lead channel", description: "Slack channel for immediate hot lead alerts", defaultValue: "#sales-hot-leads", appliesTo: ["alert"] }
    ],
    nodes: [
      { id: "intake", type: "Node", title: "Lead form intake", description: "Receives a new lead submission from the marketing site.", x: 100, y: 200 },
      { id: "enrich", type: "Node", title: "Enrichment lookup", description: "Adds firmographic and contact data from external providers.", x: 340, y: 200 },
      { id: "bant", type: "Node", title: "BANT qualifier", description: "Scores budget, authority, need, and timeline.", x: 580, y: 200 },
      { id: "tier", type: "Node", title: "Tier classifier", description: "Assigns hot, warm, or cold tier based on BANT score.", x: 820, y: 200 },
      { id: "alert", type: "Node", title: "Hot lead alert", description: "Notifies {{hot_lead_channel}} for hot leads only.", x: 1060, y: 100 },
      { id: "crm", type: "Node", title: "CRM record write", description: "Creates or updates the lead record at {{crm_endpoint}}.", x: 1060, y: 300 }
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
    description: "Run linter, security, and style reviews in parallel and post a single PR comment.",
    category: "Engineering",
    useCase: "Engineering automation",
    complexity: "advanced",
    parameters: [
      { key: "model_name", label: "Reviewer model", description: "LLM used by the review agents", defaultValue: "gpt-4.1-mini", appliesTo: ["lint", "security", "style", "aggregator"] },
      { key: "repo", label: "Repository", description: "Repository this assistant reviews", defaultValue: "owner/repo", appliesTo: ["webhook"] }
    ],
    nodes: [
      { id: "webhook", type: "Node", title: "PR opened webhook", description: "Receives pull_request events from {{repo}}.", x: 100, y: 220 },
      { id: "diff", type: "Node", title: "Diff fetcher", description: "Pulls the unified diff and changed file metadata.", x: 340, y: 220 },
      { id: "lint", type: "Node", title: "Linter review", description: "Static analysis and lint findings using {{model_name}}.", x: 580, y: 100 },
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
    title: "Document QA System",
    description: "Answer user questions over a corpus with retrieved context and inline citations.",
    category: "Knowledge",
    useCase: "Knowledge retrieval",
    complexity: "standard",
    parameters: [
      { key: "index_name", label: "Vector index", description: "Name of the vector index to query", defaultValue: "docs-prod", appliesTo: ["retriever"] },
      { key: "model_name", label: "Answering model", description: "Model used by the answering agent", defaultValue: "gpt-4.1-mini", appliesTo: ["answer"] }
    ],
    nodes: [
      { id: "question", type: "Node", title: "User question", description: "Inbound natural-language question from the user.", x: 100, y: 180 },
      { id: "retriever", type: "Node", title: "Vector retriever", description: "Searches {{index_name}} for top matching chunks.", x: 340, y: 180 },
      { id: "assembler", type: "Node", title: "Context assembler", description: "Builds an answer prompt from the retrieved chunks.", x: 580, y: 180 },
      { id: "answer", type: "Node", title: "Answering agent", description: "Generates a grounded answer using {{model_name}}.", x: 820, y: 180 },
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
    title: "Content Moderation Pipeline",
    description: "Classify user submissions, route by severity, and log every decision for audit.",
    category: "Trust & Safety",
    useCase: "Trust and safety",
    complexity: "standard",
    parameters: [
      { key: "policy_version", label: "Policy version", description: "Active moderation policy version", defaultValue: "v3.2", appliesTo: ["classifier"] }
    ],
    nodes: [
      { id: "submission", type: "Node", title: "User submission", description: "Captures any user-generated content for review.", x: 100, y: 220 },
      { id: "classifier", type: "Node", title: "Policy classifier", description: "Scores the submission against {{policy_version}} categories.", x: 340, y: 220 },
      { id: "router", type: "Node", title: "Severity router", description: "Routes by severity into low, medium, or high lanes.", x: 580, y: 220 },
      { id: "block", type: "Node", title: "Auto-block action", description: "Immediately blocks high-severity violations.", x: 840, y: 100 },
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
    id: "scheduling-assistant",
    title: "Scheduling Assistant",
    description: "Resolve calendar conflicts and propose a time the requester can confirm.",
    category: "Productivity",
    useCase: "Scheduling automation",
    complexity: "simple",
    parameters: [
      { key: "calendar_id", label: "Calendar ID", description: "Calendar to read availability from", defaultValue: "primary", appliesTo: ["calendar"] }
    ],
    nodes: [
      { id: "request", type: "Node", title: "Meeting request", description: "Inbound request describing desired attendees and window.", x: 100, y: 160 },
      { id: "calendar", type: "Node", title: "Calendar reader", description: "Reads availability from {{calendar_id}}.", x: 340, y: 160 },
      { id: "resolver", type: "Node", title: "Conflict resolver", description: "Picks slots without overlap and respects working hours.", x: 580, y: 160 },
      { id: "slot", type: "Node", title: "Proposed slot", description: "Composes a proposed meeting time and agenda.", x: 820, y: 160 },
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
    title: "Data Extraction Pipeline",
    description: "Turn uploaded documents into validated structured records, with a dead-letter for failures.",
    category: "Data",
    useCase: "Data extraction",
    complexity: "standard",
    parameters: [
      { key: "schema_name", label: "Target schema", description: "Schema the extracted record must conform to", defaultValue: "invoice_v2", appliesTo: ["validator"] },
      { key: "ocr_engine", label: "OCR engine", description: "OCR backend to use", defaultValue: "tesseract", appliesTo: ["ocr"] }
    ],
    nodes: [
      { id: "upload", type: "Node", title: "Document upload", description: "Receives a PDF or image upload from the user.", x: 100, y: 200 },
      { id: "ocr", type: "Node", title: "OCR engine", description: "Runs {{ocr_engine}} to extract raw text.", x: 340, y: 200 },
      { id: "extractor", type: "Node", title: "Field extractor", description: "Pulls structured fields from the OCR output.", x: 580, y: 200 },
      { id: "validator", type: "Node", title: "Schema validator", description: "Validates the record against {{schema_name}}.", x: 820, y: 200 },
      { id: "record", type: "Node", title: "Structured record", description: "Persists the validated record to storage.", x: 1060, y: 100 },
      { id: "dlq", type: "Node", title: "Failure dead-letter", description: "Captures extractions that fail validation for retry.", x: 1060, y: 300 }
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
    description: "Plan a multi-source investigation, synthesize findings, and fact-check the result.",
    category: "Research",
    useCase: "Multi-source research",
    complexity: "advanced",
    parameters: [
      { key: "model_name", label: "Synthesis model", description: "Model used for synthesis and fact checking", defaultValue: "gpt-4.1-mini", appliesTo: ["synth", "fact"] }
    ],
    nodes: [
      { id: "topic", type: "Node", title: "Topic question", description: "Inbound topic or open question to investigate.", x: 100, y: 240 },
      { id: "planner", type: "Node", title: "Research planner", description: "Generates a search plan across sources.", x: 340, y: 240 },
      { id: "web", type: "Node", title: "Web search", description: "Searches the open web for recent context.", x: 580, y: 100 },
      { id: "papers", type: "Node", title: "Paper search", description: "Queries academic databases for peer-reviewed sources.", x: 580, y: 240 },
      { id: "db", type: "Node", title: "Database lookup", description: "Pulls structured facts from internal databases.", x: 580, y: 380 },
      { id: "synth", type: "Node", title: "Synthesizer", description: "Drafts a brief from the combined evidence.", x: 840, y: 240 },
      { id: "fact", type: "Node", title: "Fact checker", description: "Verifies key claims against the cited sources.", x: 1100, y: 240 },
      { id: "brief", type: "Node", title: "Final brief", description: "Returns a fact-checked, source-linked research brief.", x: 1360, y: 240 }
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
    title: "Onboarding Orchestrator",
    description: "Run the full new-hire checklist from provisioning through manager handoff.",
    category: "HR / People",
    useCase: "Employee onboarding",
    complexity: "standard",
    parameters: [
      { key: "hris_system", label: "HRIS system", description: "Source HRIS that emits new hire signals", defaultValue: "Workday", appliesTo: ["signal"] },
      { key: "welcome_template", label: "Welcome template", description: "Email template ID for the welcome packet", defaultValue: "welcome_v4", appliesTo: ["packet"] }
    ],
    nodes: [
      { id: "signal", type: "Node", title: "New hire signal", description: "Triggered by {{hris_system}} when a hire is finalized.", x: 100, y: 200 },
      { id: "checklist", type: "Node", title: "Provisioning checklist", description: "Materializes the full provisioning task list.", x: 340, y: 200 },
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
    description: "Page on-call, run the right runbook, drive the response, and draft the post-mortem.",
    category: "Operations",
    useCase: "Incident response",
    complexity: "advanced",
    parameters: [
      { key: "pagerduty_service", label: "PagerDuty service", description: "Service ID used for paging on-call", defaultValue: "PXXXXXX", appliesTo: ["pager"] },
      { key: "runbook_repo", label: "Runbook repo", description: "Repository hosting the runbook library", defaultValue: "ops/runbooks", appliesTo: ["runbook"] }
    ],
    nodes: [
      { id: "alert", type: "Node", title: "Alert webhook", description: "Receives the inbound monitoring alert payload.", x: 100, y: 220 },
      { id: "severity", type: "Node", title: "Severity classifier", description: "Assigns SEV1 through SEV4 based on the signal.", x: 340, y: 220 },
      { id: "pager", type: "Node", title: "On-call pager", description: "Pages the rotation on {{pagerduty_service}}.", x: 600, y: 100 },
      { id: "runbook", type: "Node", title: "Runbook lookup", description: "Fetches the matching runbook from {{runbook_repo}}.", x: 600, y: 340 },
      { id: "executor", type: "Node", title: "Executor agent", description: "Runs the runbook steps with operator approvals.", x: 860, y: 220 },
      { id: "status", type: "Node", title: "Status updates", description: "Posts incident status updates to stakeholders.", x: 1120, y: 220 },
      { id: "postmortem", type: "Node", title: "Post-mortem draft", description: "Drafts the post-mortem from the timeline of actions.", x: 1380, y: 220 }
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
