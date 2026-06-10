import { z } from "zod";
import { env } from "@/lib/env";
import { getServerApp } from "@/lib/composition/server";
import {
  hashAgentToken,
  issueAgentTokenSecret,
  parseCapabilityList,
  type AgentCapability
} from "@/lib/protocol/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  systemId: z.string().min(1, "systemId is required")
});

const READ_ONLY_CAPABILITIES: AgentCapability[] = [
  "systems:read",
  "schema:read",
  "graph:read",
  "validation:read"
];

const TTL_HOURS = 24;
const TTL_MS = TTL_HOURS * 60 * 60 * 1000;

type ConnectClaudeResponseBody = {
  token: string;
  mcpUrl: string;
  configBlock: {
    mcpServers: Record<
      string,
      {
        url: string;
        transport: "http";
        headers: { Authorization: string };
      }
    >;
  };
  claudeDeepLink: string;
  expiresAt: string;
  capabilities: string[];
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function shortName(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return cleaned.length > 0 ? cleaned : "system";
}

function toBase64(input: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(input, "utf8").toString("base64");
  }
  // Fallback for non-Node runtimes.
  return globalThis.btoa(unescape(encodeURIComponent(input)));
}

export async function POST(request: Request): Promise<Response> {
  let app: Awaited<ReturnType<typeof getServerApp>>;
  try {
    app = await getServerApp();
  } catch {
    return jsonResponse(401, { ok: false, error: "Authentication required." });
  }

  const { ctx, services, repositories } = app;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonResponse(400, { ok: false, error: "Malformed JSON body." });
  }

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonResponse(400, {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid request."
    });
  }

  const { systemId } = parsed.data;

  // Authorization: must be allowed to view this workspace.
  try {
    services.access.ensureCanView(ctx);
  } catch {
    return jsonResponse(403, { ok: false, error: "Insufficient permissions." });
  }

  // Confirm the system belongs to this workspace.
  const systems = await repositories.systems.list(ctx.workspaceId);
  const system = systems.find((s) => s.id === systemId);
  if (!system) {
    return jsonResponse(403, {
      ok: false,
      error: "System not found in this workspace."
    });
  }

  // Mint a scoped, read-only token.
  const secret = issueAgentTokenSecret();
  const tokenHash = hashAgentToken(secret);
  const tokenPreview = `${secret.slice(0, 8)}...`;
  const capabilities = parseCapabilityList(READ_ONLY_CAPABILITIES);

  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

  let created: { id: string };
  try {
    created = await repositories.agentTokens.create({
      workspaceId: ctx.workspaceId,
      name: `Open in Claude: ${system.name}`,
      capabilities,
      systemId,
      tokenHash,
      tokenPreview,
      createdByUserId: ctx.userId
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: `Failed to issue token: ${(error as Error).message}`
    });
  }

  // Persist issuance and TTL via the audit trail (the token table itself does
  // not currently store expiresAt, so the audit row is the canonical record).
  await repositories.audits
    .add({
      actorType: ctx.actorType,
      actorId: ctx.actorId,
      workspaceId: ctx.workspaceId,
      action: "token.create",
      targetType: "agent_token",
      targetId: created.id,
      outcome: "success",
      systemId,
      metadata: JSON.stringify({
        source: "open_in_claude",
        ttlHours: TTL_HOURS,
        expiresAt,
        capabilities
      })
    })
    .catch(() => undefined);

  await repositories.audits
    .add({
      actorType: ctx.actorType,
      actorId: ctx.actorId,
      workspaceId: ctx.workspaceId,
      action: "signal.open_in_claude_clicked",
      targetType: "agent_token",
      targetId: created.id,
      outcome: "success",
      systemId
    })
    .catch(() => undefined);

  const mcpUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/protocol/mcp`;
  const serverKey = `pipes-${shortName(system.name)}`;
  const configBlock: ConnectClaudeResponseBody["configBlock"] = {
    mcpServers: {
      [serverKey]: {
        url: mcpUrl,
        transport: "http",
        headers: { Authorization: `Bearer ${secret}` }
      }
    }
  };

  const claudeDeepLink = `claude://mcp/install?config=${toBase64(
    JSON.stringify(configBlock)
  )}`;

  const responseBody: ConnectClaudeResponseBody = {
    token: secret,
    mcpUrl,
    configBlock,
    claudeDeepLink,
    expiresAt,
    capabilities
  };

  return jsonResponse(200, { ok: true, data: responseBody });
}
