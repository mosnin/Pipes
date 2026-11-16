import { NextResponse } from "next/server";
import { RunError } from "@/domain/runs/engine";
import { createWorkflowServices } from "@/domain/workflow";
import { env } from "@/lib/env";
import { MCP_TOOLS, toolDescriptors } from "@/lib/mcp/tools";
import { getProtocolContext } from "@/lib/protocol/auth";
import { ProtocolError } from "@/lib/protocol/errors";
import { hasCapability } from "@/lib/protocol/tokens";

/**
 * The Pipes MCP server (Streamable HTTP, JSON responses).
 * Clients authenticate with a Pipes API token or an OAuth access token issued
 * through /.well-known/oauth-authorization-server.
 */
const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const SERVER_INFO = { name: "pipes", title: "Pipes", version: "1.0.0" };
const INSTRUCTIONS =
  "Pipes holds the workflows your team wants agents to follow. To run one: list_workflows, start_run, then repeat (do the step you are given, call complete_step) until the run is completed. Follow each step's instructions and doneWhen. If a step is waiting for approval, a person decides it in Pipes; check back with get_current_step.";

type JsonRpcRequest = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: any };

function baseUrl(request: Request) {
  return env.NEXT_PUBLIC_APP_URL && !env.NEXT_PUBLIC_APP_URL.includes("localhost:3000") ? env.NEXT_PUBLIC_APP_URL : new URL(request.url).origin;
}

function unauthorized(request: Request, message = "Authentication required.") {
  return NextResponse.json(
    { jsonrpc: "2.0", id: null, error: { code: -32001, message } },
    { status: 401, headers: { "WWW-Authenticate": `Bearer resource_metadata="${baseUrl(request)}/.well-known/oauth-protected-resource"` } }
  );
}

const result = (id: JsonRpcRequest["id"], value: unknown) => ({ jsonrpc: "2.0" as const, id: id ?? null, result: value });
const rpcError = (id: JsonRpcRequest["id"], code: number, message: string, data?: unknown) => ({ jsonrpc: "2.0" as const, id: id ?? null, error: { code, message, data } });

async function handleOne(message: JsonRpcRequest, request: Request, auth: Awaited<ReturnType<typeof getProtocolContext>>) {
  const { id, method, params } = message;
  switch (method) {
    case "initialize": {
      const requested = params?.protocolVersion;
      return result(id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS
      });
    }
    case "ping":
      return result(id, {});
    case "tools/list":
      return result(id, { tools: toolDescriptors().filter((t) => hasCapability(auth.ctx.capabilities, MCP_TOOLS.find((m) => m.name === t.name)!.capability) || auth.ctx.actorType === "user") });
    case "tools/call": {
      const tool = MCP_TOOLS.find((t) => t.name === params?.name);
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${params?.name}`);
      const workflow = createWorkflowServices(auth.repositories);
      await workflow.usage.record(auth.ctx.workspaceId, "mcp_call", { actorType: auth.ctx.actorType });
      try {
        if (auth.ctx.actorType === "agent" && !hasCapability(auth.ctx.capabilities, tool.capability)) {
          throw new ProtocolError("PERMISSION_DENIED", `This token is missing the ${tool.capability} capability.`, 403);
        }
        const value = await tool.handler(params?.arguments ?? {}, { ctx: auth.ctx, services: auth.services, workflow, repositories: auth.repositories });
        await auth.repositories.audits
          .add({ actorType: auth.ctx.actorType, actorId: auth.ctx.actorId, workspaceId: auth.ctx.workspaceId, action: `mcp.${tool.name}`, targetType: "tool", targetId: tool.name, outcome: "success", metadata: JSON.stringify({ transport: "mcp" }) })
          .catch(() => undefined);
        return result(id, { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: value && typeof value === "object" && !Array.isArray(value) ? value : { items: value } });
      } catch (error) {
        const text = error instanceof RunError || error instanceof ProtocolError ? error.message : error instanceof Error ? error.message : "Tool failed.";
        return result(id, { content: [{ type: "text", text }], isError: true });
      }
    }
    default:
      if (method?.startsWith("notifications/")) return null;
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

export async function POST(request: Request) {
  if (!request.headers.get("authorization")) return unauthorized(request);
  let auth: Awaited<ReturnType<typeof getProtocolContext>>;
  try {
    auth = await getProtocolContext(request);
  } catch (error) {
    return unauthorized(request, error instanceof Error ? error.message : "Invalid token.");
  }
  const limited = await auth.repositories.rateLimits.consume({ bucket: `mcp:${auth.ctx.actorId}`, windowSeconds: 60, limit: 240, now: new Date().toISOString() });
  if (!limited.allowed) return NextResponse.json(rpcError(null, -32000, "Rate limit reached. Slow down."), { status: 429 });

  let body: JsonRpcRequest | JsonRpcRequest[];
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(rpcError(null, -32700, "Parse error"), { status: 400 });
  }
  const messages = Array.isArray(body) ? body : [body];
  const responses = (await Promise.all(messages.map((m) => handleOne(m, request, auth)))).filter(Boolean);
  if (responses.length === 0) return new NextResponse(null, { status: 202 });
  return NextResponse.json(Array.isArray(body) ? responses : responses[0], { headers: { "MCP-Protocol-Version": PROTOCOL_VERSIONS[0] } });
}

/** This server does not open server-initiated streams. */
export async function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}

export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: "POST" } });
}
