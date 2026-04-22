import { createBoundedServices } from "@/domain/services/bounded";
import type { AppContext } from "@/lib/repositories/contracts";
import { runtimeFlags } from "@/lib/env";
import { createConvexRepositories } from "@/lib/repositories/convex";
import { createMockRepositories } from "@/lib/repositories/mock";
import { hashAgentToken, hasCapability, type AgentCapability } from "@/lib/protocol/tokens";
import { getServerApp } from "@/lib/composition/server";
import { ProtocolError } from "@/lib/protocol/errors";

function createRepositories() {
  return !runtimeFlags.useMocks && runtimeFlags.hasConvex
    ? createConvexRepositories()
    : createMockRepositories();
}

function readBearer(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim();
}

export async function getProtocolContext(request: Request): Promise<{ ctx: AppContext; services: ReturnType<typeof createBoundedServices> }> {
  const bearer = readBearer(request);
  if (!bearer) {
    return getServerApp();
  }
  const repositories = createRepositories();
  const token = await repositories.agentTokens.findByHash(hashAgentToken(bearer));
  if (!token || token.revokedAt) throw new ProtocolError("AUTH_INVALID", "Invalid protocol token.", 401);
  await repositories.agentTokens.touchLastUsed(token.id);
  const plan = await repositories.entitlements.getPlan(token.workspaceId);
  const ctx: AppContext = {
    userId: token.createdByUserId,
    workspaceId: token.workspaceId,
    role: "Editor",
    plan,
    actorType: "agent",
    actorId: token.id,
    capabilities: token.capabilities,
    systemScope: token.systemId
  };
  return { ctx, services: createBoundedServices(repositories) };
}

export function requireCapability(ctx: AppContext, capability: AgentCapability, systemId?: string) {
  if (ctx.actorType !== "agent") return;
  if (!hasCapability(ctx.capabilities, capability)) throw new ProtocolError("PERMISSION_DENIED", `Token missing capability: ${capability}`, 403);
  if (ctx.systemScope && systemId && ctx.systemScope !== systemId) throw new ProtocolError("SCOPE_VIOLATION", "Token is scoped to another system.", 403);
}
