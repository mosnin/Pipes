import crypto from "node:crypto";

export const AGENT_CAPABILITIES = [
  "systems:read",
  "systems:write",
  "schema:read",
  "templates:read",
  "templates:instantiate",
  "versions:read",
  "versions:write",
  "graph:write",
  "comments:write",
  "import:write",
  "validation:read"
] as const;

export type AgentCapability = (typeof AGENT_CAPABILITIES)[number];

export function issueAgentTokenSecret() {
  return `ptk_${crypto.randomBytes(24).toString("base64url")}`;
}

export function hashAgentToken(secret: string) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function parseCapabilityList(input: string[]) {
  const set = new Set(AGENT_CAPABILITIES);
  return input.filter((cap): cap is AgentCapability => set.has(cap as AgentCapability));
}

export function hasCapability(capabilities: string[] | undefined, required: AgentCapability) {
  return Boolean(capabilities?.includes(required) || capabilities?.includes("systems:write"));
}
