/**
 * Agent token capabilities. Client-safe: no Node APIs, so settings pages can
 * list capabilities without pulling the token helpers (and a crypto polyfill)
 * into the browser. Secrets and hashing live in `tokens.ts`, which is server-only.
 */

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
  "validation:read",
  "runs:read",
  "runs:write",
  "memory:read",
  "memory:write",
  "connections:secrets"
] as const;

/** Capabilities that `systems:write` does not imply: reading stored secrets must be granted explicitly. */
const EXPLICIT_ONLY = new Set<string>(["connections:secrets"]);

export type AgentCapability = (typeof AGENT_CAPABILITIES)[number];

export function parseCapabilityList(input: string[]) {
  const set = new Set(AGENT_CAPABILITIES);
  return input.filter((cap): cap is AgentCapability => set.has(cap as AgentCapability));
}

export function hasCapability(capabilities: string[] | undefined, required: AgentCapability) {
  if (capabilities?.includes(required)) return true;
  return !EXPLICIT_ONLY.has(required) && Boolean(capabilities?.includes("systems:write"));
}
