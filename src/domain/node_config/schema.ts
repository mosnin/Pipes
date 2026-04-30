import type { NodeType } from "@/domain/pipes_schema_v1/schema";

export type ConfigFieldType = "text" | "textarea" | "number" | "select" | "boolean" | "url";

export type ConfigFieldDef = {
  key: string;
  label: string;
  type: ConfigFieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
  required?: boolean;
  description?: string;
};

export type NodeConfigSchema = {
  nodeType: NodeType;
  fields: ConfigFieldDef[];
};

export const NODE_CONFIG_SCHEMAS: Partial<Record<NodeType, ConfigFieldDef[]>> = {
  Agent: [
    { key: "model", label: "Model", type: "select", options: [{ value: "claude-opus-4-7", label: "Claude Opus 4.7" }, { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" }, { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" }, { value: "gpt-4o", label: "GPT-4o" }, { value: "gpt-4o-mini", label: "GPT-4o Mini" }], defaultValue: "claude-sonnet-4-6" },
    { key: "systemPrompt", label: "System prompt", type: "textarea", placeholder: "You are a helpful assistant..." },
    { key: "temperature", label: "Temperature", type: "number", placeholder: "0.7", defaultValue: 0.7 },
    { key: "maxTokens", label: "Max output tokens", type: "number", placeholder: "4096" },
    { key: "retryOnFailure", label: "Retry on failure", type: "boolean", defaultValue: false },
  ],
  Model: [
    { key: "provider", label: "Provider", type: "select", options: [{ value: "anthropic", label: "Anthropic" }, { value: "openai", label: "OpenAI" }, { value: "google", label: "Google" }, { value: "cohere", label: "Cohere" }], defaultValue: "anthropic" },
    { key: "modelId", label: "Model ID", type: "text", placeholder: "claude-sonnet-4-6" },
    { key: "temperature", label: "Temperature", type: "number", placeholder: "0.7" },
    { key: "maxTokens", label: "Max tokens", type: "number", placeholder: "4096" },
    { key: "streaming", label: "Enable streaming", type: "boolean", defaultValue: false },
  ],
  Tool: [
    { key: "endpoint", label: "Endpoint URL", type: "url", placeholder: "https://api.example.com/v1/action", required: true },
    { key: "method", label: "HTTP method", type: "select", options: [{ value: "GET", label: "GET" }, { value: "POST", label: "POST" }, { value: "PUT", label: "PUT" }, { value: "PATCH", label: "PATCH" }, { value: "DELETE", label: "DELETE" }], defaultValue: "POST" },
    { key: "authType", label: "Auth type", type: "select", options: [{ value: "none", label: "None" }, { value: "bearer", label: "Bearer token" }, { value: "api_key", label: "API key header" }, { value: "basic", label: "Basic auth" }], defaultValue: "bearer" },
    { key: "authHeader", label: "Auth header name", type: "text", placeholder: "Authorization" },
    { key: "timeout", label: "Timeout (ms)", type: "number", placeholder: "10000", defaultValue: 10000 },
    { key: "retries", label: "Max retries", type: "number", placeholder: "3", defaultValue: 3 },
  ],
  Prompt: [
    { key: "template", label: "Prompt template", type: "textarea", placeholder: "You are {{role}}. The user asks: {{input}}", required: true },
    { key: "variables", label: "Variable names (comma-separated)", type: "text", placeholder: "role, input, context" },
    { key: "outputFormat", label: "Expected output format", type: "select", options: [{ value: "text", label: "Plain text" }, { value: "json", label: "JSON object" }, { value: "markdown", label: "Markdown" }], defaultValue: "text" },
  ],
  Memory: [
    { key: "storageType", label: "Storage type", type: "select", options: [{ value: "vector", label: "Vector (semantic)" }, { value: "kv", label: "Key-value" }, { value: "session", label: "Session (ephemeral)" }], defaultValue: "vector" },
    { key: "namespace", label: "Namespace / collection", type: "text", placeholder: "my-memory-store" },
    { key: "topK", label: "Top-K results", type: "number", placeholder: "5", defaultValue: 5 },
    { key: "threshold", label: "Similarity threshold", type: "number", placeholder: "0.75" },
  ],
  Datastore: [
    { key: "connectionType", label: "Connection type", type: "select", options: [{ value: "postgres", label: "PostgreSQL" }, { value: "mysql", label: "MySQL" }, { value: "sqlite", label: "SQLite" }, { value: "mongodb", label: "MongoDB" }, { value: "redis", label: "Redis" }], defaultValue: "postgres" },
    { key: "tableName", label: "Table / collection", type: "text", placeholder: "users", required: true },
    { key: "operation", label: "Default operation", type: "select", options: [{ value: "select", label: "Select / read" }, { value: "insert", label: "Insert / create" }, { value: "upsert", label: "Upsert" }, { value: "delete", label: "Delete" }], defaultValue: "select" },
    { key: "limit", label: "Row limit", type: "number", placeholder: "100", defaultValue: 100 },
  ],
  Decision: [
    { key: "strategy", label: "Decision strategy", type: "select", options: [{ value: "predicate", label: "Boolean predicate" }, { value: "classification", label: "Classification" }, { value: "threshold", label: "Threshold comparison" }, { value: "llm", label: "LLM-based reasoning" }], defaultValue: "predicate" },
    { key: "expression", label: "Predicate expression", type: "text", placeholder: "input.score > 0.8" },
    { key: "defaultBranch", label: "Default branch (on no match)", type: "select", options: [{ value: "true", label: "True branch" }, { value: "false", label: "False branch" }, { value: "error", label: "Error" }], defaultValue: "false" },
  ],
  Router: [
    { key: "routingStrategy", label: "Routing strategy", type: "select", options: [{ value: "round_robin", label: "Round robin" }, { value: "content_based", label: "Content-based" }, { value: "load_balanced", label: "Load balanced" }, { value: "priority", label: "Priority order" }], defaultValue: "content_based" },
    { key: "maxFanout", label: "Max parallel branches", type: "number", placeholder: "4", defaultValue: 4 },
  ],
  Loop: [
    { key: "maxIterations", label: "Max iterations", type: "number", placeholder: "10", defaultValue: 10 },
    { key: "stopCondition", label: "Stop condition", type: "text", placeholder: "result.done === true" },
    { key: "iterationDelay", label: "Delay between iterations (ms)", type: "number", placeholder: "0", defaultValue: 0 },
  ],
  Guardrail: [
    { key: "policy", label: "Policy type", type: "select", options: [{ value: "content_safety", label: "Content safety" }, { value: "pii_detection", label: "PII detection" }, { value: "rate_limit", label: "Rate limit" }, { value: "custom", label: "Custom" }], defaultValue: "content_safety" },
    { key: "action", label: "Action on violation", type: "select", options: [{ value: "block", label: "Block" }, { value: "flag", label: "Flag and continue" }, { value: "redact", label: "Redact" }], defaultValue: "block" },
    { key: "threshold", label: "Confidence threshold", type: "number", placeholder: "0.9" },
  ],
  HumanApproval: [
    { key: "approvers", label: "Approver group / role", type: "text", placeholder: "admin, manager" },
    { key: "timeoutHours", label: "Approval timeout (hours)", type: "number", placeholder: "24", defaultValue: 24 },
    { key: "escalateOnTimeout", label: "Escalate on timeout", type: "boolean", defaultValue: true },
    { key: "requireNote", label: "Require approval note", type: "boolean", defaultValue: false },
  ],
  ExternalApi: [
    { key: "baseUrl", label: "Base URL", type: "url", placeholder: "https://api.service.com", required: true },
    { key: "authType", label: "Auth type", type: "select", options: [{ value: "none", label: "None" }, { value: "bearer", label: "Bearer token" }, { value: "oauth2", label: "OAuth 2.0" }, { value: "api_key", label: "API key" }], defaultValue: "bearer" },
    { key: "rateLimit", label: "Rate limit (req/min)", type: "number", placeholder: "60" },
  ],
  Monitor: [
    { key: "metrics", label: "Tracked metrics (comma-separated)", type: "text", placeholder: "latency, error_rate, token_count" },
    { key: "alertThreshold", label: "Alert threshold", type: "number", placeholder: "0.05" },
    { key: "sampleRate", label: "Sample rate (0-1)", type: "number", placeholder: "1.0", defaultValue: 1.0 },
  ],
  Trigger: [
    { key: "triggerType", label: "Trigger type", type: "select", options: [{ value: "webhook", label: "Webhook" }, { value: "schedule", label: "Schedule (cron)" }, { value: "event", label: "Event" }, { value: "manual", label: "Manual" }], defaultValue: "webhook" },
    { key: "filter", label: "Event filter expression", type: "text", placeholder: "event.type === 'message'" },
  ],
  Schedule: [
    { key: "cronExpression", label: "Cron expression", type: "text", placeholder: "0 9 * * MON-FRI", required: true },
    { key: "timezone", label: "Timezone", type: "text", placeholder: "UTC", defaultValue: "UTC" },
  ],
  Input: [
    { key: "label", label: "Input label", type: "text", placeholder: "User request" },
    { key: "schema", label: "Expected input schema (JSON)", type: "textarea", placeholder: '{ "type": "object", "properties": { "message": { "type": "string" } } }' },
    { key: "required", label: "Required fields (comma-separated)", type: "text", placeholder: "message, userId" },
  ],
  Output: [
    { key: "format", label: "Output format", type: "select", options: [{ value: "text", label: "Plain text" }, { value: "json", label: "JSON" }, { value: "markdown", label: "Markdown" }, { value: "stream", label: "Streaming" }], defaultValue: "text" },
    { key: "destination", label: "Destination hint", type: "text", placeholder: "UI, webhook, file" },
  ],
};

export function getConfigSchema(nodeType: NodeType): ConfigFieldDef[] {
  return NODE_CONFIG_SCHEMAS[nodeType] ?? [];
}
