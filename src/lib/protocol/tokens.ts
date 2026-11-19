import "server-only";
import crypto from "node:crypto";

// Capabilities are client-safe; they are re-exported so server callers keep one import.
export { AGENT_CAPABILITIES, hasCapability, parseCapabilityList, type AgentCapability } from "@/lib/protocol/capabilities";

export function issueAgentTokenSecret() {
  return `ptk_${crypto.randomBytes(24).toString("base64url")}`;
}

export function hashAgentToken(secret: string) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}
