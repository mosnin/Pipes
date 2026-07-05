import { z } from "zod";
import { AiSystemDraftSchema } from "@/lib/ai";
import { generateStructured } from "@/lib/ai/structured";

export const DOC_TYPES = ["sop", "api_spec", "documentation", "book"] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const CompileRequestSchema = z.object({
  content: z.string().min(10).max(20000),
  docType: z.enum(DOC_TYPES).optional(),
});

export type CompileRequest = z.infer<typeof CompileRequestSchema>;
export type CompiledGraph = z.infer<typeof AiSystemDraftSchema>;

// ---------------------------------------------------------------------------
// System prompts per document type
// ---------------------------------------------------------------------------

const BASE_SCHEMA_INSTRUCTION = `Return ONLY strict JSON with this shape (no markdown, no explanation):
{ "systemName": string, "description": string, "nodes": [{"id": string, "type": string, "title": string, "description": string, "x": number, "y": number}], "pipes": [{"fromNodeId": string, "toNodeId": string}], "assumptions": string[], "warnings": string[] }

Valid node types (use ONLY these): Node, Agent, Tool, Model, Prompt, Memory, Input, Output, Action, Decision, Condition, Router, Loop, Queue, Datastore, ExternalApi, HumanApproval, Guardrail, Monitor, Trigger, Schedule, Environment, Subsystem, SubLoop, Reference, LoopControl, Checkpoint, Evaluator, HumanReview.

Layout: x starts at 80, increments by 200 per step. y=160 for main flow, y=60 for success branch, y=280 for failure/alternate branch. Minimum 5 nodes.`;

const AUTO_DETECT_PROMPT = `You are a Pipes skill compiler. First, identify what kind of document this is (SOP, API spec, technical documentation, or book/framework), then apply the appropriate compilation rules.

Auto-detection rules:
- SOPs: numbered steps, procedures, roles, escalation paths, "if X then Y" flows
- API specs: endpoints, HTTP verbs, request/response shapes, authentication sections
- Documentation: READMEs, system descriptions, architecture docs, capability descriptions
- Books/frameworks: named frameworks, stage/phase models, decision models, long-form concepts

SOP compilation rules: sequential steps → Action nodes; decisions → Decision nodes; "must approve" → HumanApproval; "retry/loop" → Loop + LoopControl; "log/store" → Datastore; always start Input, end Output.
API compilation rules: auth endpoints → Environment; operations → Tool or ExternalApi; validation → Guardrail; pagination → Loop; webhooks → Trigger; always Input → Agent → [Tools] → Output.
Documentation compilation rules: capabilities → node clusters; "user provides" → Input; "AI analyzes" → Agent; "integrates with" → ExternalApi; "stores" → Datastore; "monitors" → Monitor; functional subsystems → Subsystem nodes.
Book/framework compilation rules: stages/phases → Action nodes; cyclical models → Loop; decision points → Decision; "measure/evaluate" → Evaluator; feedback → LoopControl back-edge; aim for 8-15 nodes.

${BASE_SCHEMA_INSTRUCTION}`;

const SYSTEM_PROMPTS: Record<DocType, string> = {
  sop: `You are a Pipes skill compiler specializing in Standard Operating Procedures.
Extract every step, decision, and exception path from the SOP and map it to a precise agent graph.

Mapping rules:
- Sequential steps → Action nodes chained with Pipes
- "Review / verify / check" → Guardrail or Evaluator node
- "If X then Y, else Z" → Decision node with two output Pipes (label them true/false)
- "Repeat until / retry" → Loop node with a LoopControl at the exit
- "Manager / supervisor must approve" → HumanApproval node
- "Send to [external system / API]" → ExternalApi or Tool node
- "Log / store / record" → Memory or Datastore node
- "Notify / alert" → Agent node (notification agent)
- Group 3+ related steps into a Subsystem node with a descriptive name
- Always start with Input (trigger), always end with Output (result)
- Add Monitor node if the SOP mentions SLAs, timeouts, or escalation

${BASE_SCHEMA_INSTRUCTION}`,

  api_spec: `You are a Pipes skill compiler specializing in API specifications.
Convert this API spec into an agent graph showing how an AI would orchestrate calls to achieve a goal.

Mapping rules:
- Auth / token endpoints → Environment node (top-left)
- Each meaningful endpoint or operation → Tool or ExternalApi node
- Request validation / schema check → Guardrail node
- Rate limiting / retry logic → LoopControl node
- Response parsing / transformation → Action node
- Pagination / batching → Loop node
- Webhook / callback endpoints → Trigger node
- Group endpoint families (e.g. /users/*, /orders/*) into Subsystem nodes
- Main agent orchestrating all calls → Agent node (center)
- Always: Input → Agent → [Tools] → Output

${BASE_SCHEMA_INSTRUCTION}`,

  documentation: `You are a Pipes skill compiler specializing in technical documentation.
Extract every workflow, process, and capability described in the docs and model it as an executable agent graph.

Mapping rules:
- Each described process or capability → set of nodes
- "User provides / submits" → Input node
- "System decides / routes" → Decision or Router node
- "AI analyzes / generates" → Agent node
- "Calls / integrates with" → ExternalApi node
- "Stores / retrieves" → Datastore or Memory node
- "Monitors / alerts on" → Monitor node
- "Requires human review" → HumanReview or HumanApproval node
- Group functional subsystems (e.g. auth, billing, ML) into Subsystem nodes
- Use Annotation sparingly for major concepts that don't fit other types

${BASE_SCHEMA_INSTRUCTION}`,

  book: `You are a Pipes skill compiler specializing in books, frameworks, and long-form content.
Distill the key frameworks, decision models, and processes into an executable agent graph.

Mapping rules:
- Core framework stages / phases → Action nodes in sequence
- The book's central model or loop → a Loop node (if cyclical) or main flow
- Key decision points described → Decision or Condition nodes
- "Measure / evaluate / score" → Evaluator node
- "Feedback / adjust" → LoopControl with a back-edge Pipe
- Stakeholder touchpoints → HumanApproval or HumanReview nodes
- Supporting tools / methods mentioned → Tool nodes
- Chapter themes that form distinct sub-processes → Subsystem nodes
- Focus on making the graph executable, not encyclopedic — 8-15 nodes ideal

${BASE_SCHEMA_INSTRUCTION}`,
};

// ---------------------------------------------------------------------------
// Mock responses (deterministic, per doc type)
// ---------------------------------------------------------------------------

const MOCK_RESULTS: Record<DocType, CompiledGraph> = {
  sop: {
    systemName: "Customer Onboarding SOP",
    description: "Auto-compiled: Validates, provisions, and activates new customers with human escalation for edge cases.",
    nodes: [
      { id: "n_trigger", type: "Input", title: "New Customer Request", description: "Incoming sign-up or account request", x: 80, y: 160 },
      { id: "n_kyc", type: "Guardrail", title: "KYC Validation", description: "Verify identity documents against external registry", x: 280, y: 160 },
      { id: "n_decide", type: "Decision", title: "Identity Verified?", description: "Branch based on KYC result", x: 480, y: 160 },
      { id: "n_provision", type: "Action", title: "Provision Account", description: "Create workspace, set permissions, seed initial data", x: 680, y: 60 },
      { id: "n_review", type: "HumanApproval", title: "Manual Review", description: "Compliance officer reviews flagged submissions", x: 680, y: 280 },
      { id: "n_notify", type: "Agent", title: "Notify & Welcome", description: "Send welcome email and Slack notification to onboarding team", x: 880, y: 160 },
      { id: "n_crm", type: "Datastore", title: "Update CRM", description: "Write account status and onboarding timestamp to CRM", x: 1080, y: 160 },
      { id: "n_out", type: "Output", title: "Customer Activated", description: "Final state: customer can log in and use the product", x: 1280, y: 160 },
    ],
    pipes: [
      { fromNodeId: "n_trigger", toNodeId: "n_kyc" },
      { fromNodeId: "n_kyc", toNodeId: "n_decide" },
      { fromNodeId: "n_decide", toNodeId: "n_provision" },
      { fromNodeId: "n_decide", toNodeId: "n_review" },
      { fromNodeId: "n_provision", toNodeId: "n_notify" },
      { fromNodeId: "n_review", toNodeId: "n_notify" },
      { fromNodeId: "n_notify", toNodeId: "n_crm" },
      { fromNodeId: "n_crm", toNodeId: "n_out" },
    ],
    assumptions: ["SOP targets B2B customers requiring identity verification.", "CRM is accessible via internal API."],
    warnings: ["Manual review path may create bottlenecks. Consider adding SLA monitor."],
  },

  api_spec: {
    systemName: "Stripe Payments Orchestrator",
    description: "Auto-compiled: Full payment lifecycle — auth, charge, dispute, and refund — orchestrated by a single agent.",
    nodes: [
      { id: "n_env", type: "Environment", title: "Stripe API Keys", description: "Loads STRIPE_SECRET_KEY from environment", x: 80, y: 60 },
      { id: "n_input", type: "Input", title: "Payment Intent", description: "amount, currency, customer_id, metadata", x: 80, y: 180 },
      { id: "n_agent", type: "Agent", title: "Payment Orchestrator", description: "Coordinates auth, capture, and error handling", x: 280, y: 180 },
      { id: "n_validate", type: "Guardrail", title: "Amount & Currency Check", description: "Validates against min/max limits and supported currencies", x: 480, y: 80 },
      { id: "n_charge", type: "Tool", title: "POST /v1/payment_intents", description: "Creates and confirms payment intent via Stripe API", x: 480, y: 200 },
      { id: "n_webhook", type: "Trigger", title: "payment_intent.succeeded", description: "Stripe webhook fires on successful capture", x: 480, y: 320 },
      { id: "n_retry", type: "LoopControl", title: "Retry on Decline", description: "Up to 3 retries with exponential backoff on card_declined", x: 680, y: 200 },
      { id: "n_store", type: "Datastore", title: "Log to Payments DB", description: "Persist charge_id, status, amount, timestamp", x: 880, y: 180 },
      { id: "n_out", type: "Output", title: "Payment Confirmation", description: "Returns charge_id and receipt_url to caller", x: 1080, y: 180 },
    ],
    pipes: [
      { fromNodeId: "n_env", toNodeId: "n_agent" },
      { fromNodeId: "n_input", toNodeId: "n_agent" },
      { fromNodeId: "n_agent", toNodeId: "n_validate" },
      { fromNodeId: "n_agent", toNodeId: "n_charge" },
      { fromNodeId: "n_charge", toNodeId: "n_retry" },
      { fromNodeId: "n_webhook", toNodeId: "n_store" },
      { fromNodeId: "n_retry", toNodeId: "n_store" },
      { fromNodeId: "n_store", toNodeId: "n_out" },
    ],
    assumptions: ["Uses Stripe API v1. Webhook endpoint configured in Stripe dashboard.", "Retry logic applies only to card_declined errors, not fraud blocks."],
    warnings: ["Idempotency keys should be set on all POST calls to avoid double charges."],
  },

  documentation: {
    systemName: "Extracted: Docs Workflow",
    description: "Auto-compiled: Key processes extracted from documentation, modeled as an executable agent graph.",
    nodes: [
      { id: "n_in", type: "Input", title: "User Request", description: "Entry point — user query or task", x: 80, y: 160 },
      { id: "n_classify", type: "Agent", title: "Intent Classifier", description: "Determines request type and routes accordingly", x: 280, y: 160 },
      { id: "n_router", type: "Router", title: "Request Router", description: "Routes to appropriate handler based on intent", x: 480, y: 160 },
      { id: "n_retrieve", type: "Memory", title: "Context Retrieval", description: "Fetches relevant history and user preferences", x: 680, y: 80 },
      { id: "n_process", type: "Action", title: "Core Processing", description: "Executes the primary action or generates response", x: 680, y: 200 },
      { id: "n_validate", type: "Evaluator", title: "Output Validation", description: "Checks response quality and safety constraints", x: 880, y: 160 },
      { id: "n_out", type: "Output", title: "Final Response", description: "Delivers result to the user", x: 1080, y: 160 },
    ],
    pipes: [
      { fromNodeId: "n_in", toNodeId: "n_classify" },
      { fromNodeId: "n_classify", toNodeId: "n_router" },
      { fromNodeId: "n_router", toNodeId: "n_retrieve" },
      { fromNodeId: "n_router", toNodeId: "n_process" },
      { fromNodeId: "n_retrieve", toNodeId: "n_process" },
      { fromNodeId: "n_process", toNodeId: "n_validate" },
      { fromNodeId: "n_validate", toNodeId: "n_out" },
    ],
    assumptions: ["Documentation describes a general-purpose request handling system."],
    warnings: [],
  },

  book: {
    systemName: "Compiled Framework: Think Fast and Slow",
    description: "Auto-compiled: Dual-process decision model mapped to an executable agent loop.",
    nodes: [
      { id: "n_input", type: "Input", title: "Decision Stimulus", description: "External event requiring a decision", x: 80, y: 160 },
      { id: "n_system1", type: "Agent", title: "System 1: Fast Thinking", description: "Intuitive, heuristic-based rapid assessment", x: 280, y: 80 },
      { id: "n_system2", type: "Agent", title: "System 2: Slow Thinking", description: "Deliberate, analytical reasoning", x: 280, y: 280 },
      { id: "n_eval", type: "Evaluator", title: "Cognitive Load Check", description: "Determines if System 1 shortcut is safe or needs override", x: 480, y: 160 },
      { id: "n_bias", type: "Guardrail", title: "Bias Detector", description: "Checks for anchoring, availability, and framing effects", x: 680, y: 160 },
      { id: "n_human", type: "HumanReview", title: "Human Judgment", description: "High-stakes decisions escalate for human review", x: 880, y: 80 },
      { id: "n_decide", type: "Action", title: "Commit Decision", description: "Log reasoning chain and execute chosen action", x: 880, y: 240 },
      { id: "n_loop", type: "Loop", title: "Feedback Loop", description: "Outcome feeds back to update heuristics", x: 1080, y: 160 },
      { id: "n_out", type: "Output", title: "Decision + Rationale", description: "Returns the decision with full reasoning trace", x: 1280, y: 160 },
    ],
    pipes: [
      { fromNodeId: "n_input", toNodeId: "n_system1" },
      { fromNodeId: "n_input", toNodeId: "n_system2" },
      { fromNodeId: "n_system1", toNodeId: "n_eval" },
      { fromNodeId: "n_system2", toNodeId: "n_eval" },
      { fromNodeId: "n_eval", toNodeId: "n_bias" },
      { fromNodeId: "n_bias", toNodeId: "n_human" },
      { fromNodeId: "n_bias", toNodeId: "n_decide" },
      { fromNodeId: "n_human", toNodeId: "n_decide" },
      { fromNodeId: "n_decide", toNodeId: "n_loop" },
      { fromNodeId: "n_loop", toNodeId: "n_out" },
    ],
    assumptions: ["Based on Kahneman's dual-process theory. Suitable for high-stakes decision agents."],
    warnings: ["System 1 shortcuts may introduce bias in novel or adversarial situations."],
  },
};

// ---------------------------------------------------------------------------
// Compile: document → agent graph
// ---------------------------------------------------------------------------

export function compileDocument(req: CompileRequest): Promise<CompiledGraph> {
  const systemPrompt = req.docType ? SYSTEM_PROMPTS[req.docType] : AUTO_DETECT_PROMPT;
  const mockResult = req.docType ? MOCK_RESULTS[req.docType] : MOCK_RESULTS.documentation;
  return generateStructured({
    system: systemPrompt,
    user: `DOCUMENT TO COMPILE:\n\n${req.content}`,
    schema: AiSystemDraftSchema,
    temperature: 0.15,
    title: "Pipes Skill Compiler",
    mock: () => mockResult,
  });
}
