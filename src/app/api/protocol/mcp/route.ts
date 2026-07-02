import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getProtocolContext, requireCapability } from "@/lib/protocol/auth";
import { ProtocolError, mapProtocolError, mcpErrorPayload } from "@/lib/protocol/errors";

// This endpoint speaks TWO shapes over one URL:
//
//   1. JSON-RPC 2.0 — the real Model Context Protocol (Streamable HTTP
//      transport). This is what Claude and any MCP client actually POST:
//      `initialize`, `tools/list`, `tools/call`, plus `notifications/*`.
//      Auth is the same `Bearer ptk_...` agent token on every message.
//
//   2. Legacy `{ tool, input }` — the app's own internal callers and tests.
//      Preserved for backward compatibility; both shapes run the same tool
//      dispatcher below.

const MCP_PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "looper", version: "1.0.0" };

type ToolContext = {
  ctx: Awaited<ReturnType<typeof getProtocolContext>>["ctx"];
  services: Awaited<ReturnType<typeof getProtocolContext>>["services"];
  repositories: Awaited<ReturnType<typeof getProtocolContext>>["repositories"];
  requestId: string;
};

type ToolDef = {
  name: string;
  capability: string | null;
  description: string;
  inputSchema: Record<string, unknown>;
};

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: "object",
  properties,
  ...(required.length ? { required } : {}),
  additionalProperties: true,
});
const str = { type: "string" } as const;
const num = { type: "number" } as const;

// Single source of truth for tool metadata — used by both tools/list (MCP)
// and describe_tools (legacy). inputSchema is real JSON Schema so MCP clients
// can render argument forms and validate calls.
const TOOL_DEFS: ToolDef[] = [
  { name: "list_systems", capability: "systems:read", description: "List all loops (systems) in the workspace.", inputSchema: obj({}) },
  { name: "get_system", capability: "systems:read", description: "Get a full loop bundle including nodes and pipes.", inputSchema: obj({ systemId: str }, ["systemId"]) },
  { name: "export_system_schema", capability: "schema:read", description: "Export a loop as canonical looper_schema_v1 JSON.", inputSchema: obj({ systemId: str }, ["systemId"]) },
  { name: "list_templates", capability: "templates:read", description: "List available starter templates.", inputSchema: obj({}) },
  { name: "instantiate_template", capability: "templates:instantiate", description: "Create a new loop from a template.", inputSchema: obj({ templateId: str, name: str, params: { type: "object" } }, ["templateId"]) },
  { name: "create_system_from_schema", capability: "import:write", description: "Import looper_schema_v1 JSON as a new loop.", inputSchema: obj({ canonical: {} }, ["canonical"]) },
  { name: "create_version", capability: "versions:write", description: "Snapshot the current loop state.", inputSchema: obj({ systemId: str, name: str }, ["systemId"]) },
  { name: "apply_graph_actions", capability: "graph:write", description: "Apply one or many graph mutations. Each action is one of addNode|updateNode|deleteNode|addPipe|deletePipe. Pass a single `action` or an `actions[]` array.", inputSchema: obj({ systemId: str, action: { type: "object" }, actions: { type: "array", items: { type: "object" } } }, ["systemId"]) },
  { name: "add_comment", capability: "comments:write", description: "Add a comment to a loop or a node.", inputSchema: obj({ systemId: str, body: str, nodeId: str }, ["systemId", "body"]) },
  { name: "get_validation_report", capability: "validation:read", description: "Get node/pipe counts and basic validation for a loop.", inputSchema: obj({ systemId: str }, ["systemId"]) },
  { name: "propose_loop_edit", capability: "graph:write", description: "Propose canvas steps for human review. Steps appear as ghost nodes the human accepts (via apply_graph_actions) or dismisses.", inputSchema: obj({ systemId: str, steps: { type: "array", items: { type: "object", properties: { type: str, title: str, description: str, rationale: str, x: num, y: num }, required: ["title"] } } }, ["systemId", "steps"]) },
  { name: "export_subsystem_blueprint", capability: "graph:write", description: "Export a subsystem node as a reusable blueprint.", inputSchema: obj({ systemId: str, subsystemNodeId: str, name: str }, ["systemId", "subsystemNodeId"]) },
  { name: "list_blueprints", capability: "systems:read", description: "List all saved subsystem blueprints in the workspace.", inputSchema: obj({}) },
  { name: "instantiate_blueprint", capability: "graph:write", description: "Instantiate a saved subsystem blueprint into a target loop.", inputSchema: obj({ blueprintId: str, targetSystemId: str, offsetX: num, offsetY: num }, ["blueprintId", "targetSystemId"]) },
  { name: "learn_patterns", capability: "versions:write", description: "Analyze a loop and store recurring structural patterns as reusable memories.", inputSchema: obj({ systemId: str }, ["systemId"]) },
  { name: "list_patterns", capability: "systems:read", description: "List stored structural patterns for the workspace or a specific loop.", inputSchema: obj({ systemId: str }) },
  { name: "ping", capability: null, description: "Health check; confirms the token authenticates.", inputSchema: obj({}) },
  { name: "describe_tools", capability: null, description: "List all available tools and their required capabilities.", inputSchema: obj({}) },
];

// Runs one tool by name, returning its raw data or throwing a ProtocolError.
// Shared by the JSON-RPC (tools/call) and legacy ({tool,input}) entry points.
async function dispatchTool(tool: string, input: Record<string, any>, o: ToolContext): Promise<unknown> {
  const { ctx, services, requestId } = o;
  const audit = (action: string, extra: Record<string, unknown>) =>
    services.protocol.writeAudit(ctx, { ...extra, action, outcome: "success", metadata: JSON.stringify({ transport: "mcp", requestId, tool, ...(extra.metadata as object ?? {}) }) } as any);

  switch (tool) {
    case "list_systems":
      requireCapability(ctx, "systems:read");
      return services.systems.list(ctx);
    case "get_system":
      requireCapability(ctx, "systems:read", input.systemId);
      return services.systems.getBundle(ctx, input.systemId);
    case "export_system_schema":
      requireCapability(ctx, "schema:read", input.systemId);
      return services.schema.export(ctx, input.systemId);
    case "list_templates":
      requireCapability(ctx, "templates:read");
      return services.templates.list();
    case "instantiate_template": {
      requireCapability(ctx, "templates:instantiate");
      const data = await services.templates.instantiate(ctx, input.templateId, input.name, input.params);
      await audit("protocol.template.instantiate", { targetType: "template", targetId: input.templateId });
      return data;
    }
    case "create_system_from_schema": {
      requireCapability(ctx, "import:write");
      const data = await services.importExport.importSchema(ctx, input.canonical, "new");
      await audit("protocol.schema.import", { targetType: "schema" });
      return data;
    }
    case "create_version": {
      requireCapability(ctx, "versions:write", input.systemId);
      await services.versions.create(ctx, input.systemId, input.name ?? "MCP snapshot");
      await audit("protocol.version.create", { targetType: "system", targetId: input.systemId, systemId: input.systemId });
      return { ok: true };
    }
    case "apply_graph_actions": {
      requireCapability(ctx, "graph:write", input.systemId);
      const actions = Array.isArray(input.actions) ? input.actions : [input.action].filter(Boolean);
      const results: unknown[] = [];
      for (const action of actions) results.push(await services.graph.mutate(ctx, action));
      await audit("protocol.graph.batch_mutate", { targetType: "system", targetId: input.systemId, systemId: input.systemId, metadata: { actionCount: results.length } });
      return { results, count: results.length };
    }
    case "add_comment": {
      requireCapability(ctx, "comments:write", input.systemId);
      await services.comments.add(ctx, { systemId: input.systemId, body: input.body, nodeId: input.nodeId });
      await audit("protocol.comment.add", { targetType: "system", targetId: input.systemId, systemId: input.systemId });
      return { ok: true };
    }
    case "get_validation_report": {
      requireCapability(ctx, "validation:read", input.systemId);
      const { validateSystem } = await import("@/domain/validation");
      const bundle = await services.systems.getBundle(ctx, input.systemId);
      const ports = bundle.nodes.flatMap((n: any) => [
        n.portIds?.[0] ? { id: n.portIds[0], nodeId: n.id, key: "in", label: "in", direction: "input", dataType: "any", required: false } : null,
        n.portIds?.[1] ? { id: n.portIds[1], nodeId: n.id, key: "out", label: "out", direction: "output", dataType: "any", required: false } : null,
      ]).filter(Boolean) as any[];
      const system = bundle.system as any;
      return validateSystem(
        { id: system.id, workspaceId: system.workspaceId, name: system.name, description: system.description, createdBy: system.createdBy, createdAt: system.createdAt, updatedAt: system.updatedAt, nodeIds: bundle.nodes.map((n: any) => n.id), portIds: bundle.nodes.flatMap((n: any) => n.portIds ?? []), pipeIds: bundle.pipes.map((p: any) => p.id), groupIds: [], annotationIds: [], commentIds: [], assetIds: [], snippetIds: [], subsystemNodeIds: [] } as any,
        bundle.nodes as any,
        ports,
        bundle.pipes as any,
      );
    }
    case "propose_loop_edit": {
      requireCapability(ctx, "graph:write", input.systemId);
      const steps: Array<{ type: string; title: string; description?: string; rationale?: string; x?: number; y?: number }> = Array.isArray(input.steps) ? input.steps : [];
      if (steps.length === 0) throw new ProtocolError("VALIDATION_ERROR", "steps must be a non-empty array.", 400);
      const batchId = crypto.randomUUID();
      const proposalItems = steps.map((step, idx) => ({
        diffId: `${batchId}_${idx}`, entityType: step.type ?? "Node", entityId: `proposed_${batchId}_${idx}`,
        changeType: "addition", previewKind: "addition", emphasis: "pending_review" as const,
        title: step.title, description: step.description, rationale: step.rationale, x: step.x, y: step.y,
      }));
      await services.comments.add(ctx, { systemId: input.systemId, body: `[loop_proposal] ${JSON.stringify({ batchId, steps: proposalItems })}` });
      await audit("protocol.loop.propose", { targetType: "system", targetId: input.systemId, systemId: input.systemId, metadata: { stepCount: steps.length } });
      return { batchId, stepCount: steps.length, proposalItems, message: "Proposals queued for human review on the canvas." };
    }
    case "export_subsystem_blueprint": {
      requireCapability(ctx, "graph:write", input.systemId);
      const { SubsystemBlueprintService } = await import("@/domain/subsystem_blueprint/service");
      const { repositories } = await (await import("@/lib/composition/server")).getServerApp();
      const data = await new SubsystemBlueprintService(repositories).export(ctx, { systemId: input.systemId, subsystemNodeId: input.subsystemNodeId, name: input.name });
      await audit("protocol.blueprint.export", { targetType: "system", targetId: input.systemId, systemId: input.systemId });
      return data;
    }
    case "list_blueprints": {
      requireCapability(ctx, "systems:read");
      const { SubsystemBlueprintService } = await import("@/domain/subsystem_blueprint/service");
      const { repositories } = await (await import("@/lib/composition/server")).getServerApp();
      return new SubsystemBlueprintService(repositories).list(ctx);
    }
    case "instantiate_blueprint": {
      requireCapability(ctx, "graph:write", input.targetSystemId);
      const { SubsystemBlueprintService } = await import("@/domain/subsystem_blueprint/service");
      const { repositories } = await (await import("@/lib/composition/server")).getServerApp();
      const data = await new SubsystemBlueprintService(repositories).instantiate(ctx, { blueprintId: input.blueprintId, targetSystemId: input.targetSystemId, offsetX: input.offsetX, offsetY: input.offsetY });
      await audit("protocol.blueprint.instantiate", { targetType: "system", targetId: input.targetSystemId, systemId: input.targetSystemId });
      return data;
    }
    case "learn_patterns": {
      requireCapability(ctx, "versions:write", input.systemId);
      const { PatternLearningService } = await import("@/domain/services/pattern_learning");
      const { repositories } = await (await import("@/lib/composition/server")).getServerApp();
      return new PatternLearningService(repositories).learnFromSystem(ctx, input.systemId);
    }
    case "list_patterns": {
      requireCapability(ctx, "systems:read");
      const { PatternLearningService } = await import("@/domain/services/pattern_learning");
      const { repositories } = await (await import("@/lib/composition/server")).getServerApp();
      return new PatternLearningService(repositories).listPatterns(ctx, input.systemId);
    }
    case "ping":
      return { authenticated: true, userId: ctx.userId };
    case "describe_tools":
      return { tools: TOOL_DEFS.map((t) => ({ name: t.name, capability: t.capability, description: t.description })) };
    default:
      throw new ProtocolError("NOT_FOUND", "Unknown MCP tool.", 404);
  }
}

const jsonRpcResult = (id: unknown, result: unknown) => NextResponse.json({ jsonrpc: "2.0", id, result });
const jsonRpcError = (id: unknown, code: number, message: string, status = 200) =>
  NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }, { status });

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error: invalid JSON.", 400);
  }

  const isJsonRpc = payload && payload.jsonrpc === "2.0" && typeof payload.method === "string";

  try {
    const { ctx, services, repositories } = await getProtocolContext(request);
    const toolCtx: ToolContext = { ctx, services, repositories, requestId };

    // ---- JSON-RPC 2.0 (real MCP) ------------------------------------------
    if (isJsonRpc) {
      const { id, method, params } = payload;

      // Notifications (no id) get a 202 with no body.
      if (id === undefined || id === null) {
        return new NextResponse(null, { status: 202 });
      }

      if (method === "initialize") {
        return jsonRpcResult(id, {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: "Looper exposes your agent loops as tools. Call tools/list to see them; each is gated by the capabilities on your token.",
        });
      }
      if (method === "ping") {
        return jsonRpcResult(id, {});
      }
      if (method === "tools/list") {
        return jsonRpcResult(id, {
          tools: TOOL_DEFS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
        });
      }
      if (method === "tools/call") {
        const name = params?.name;
        const args = params?.arguments ?? {};
        if (typeof name !== "string") return jsonRpcError(id, -32602, "Invalid params: tool name required.");
        await services.guards.consumeRateLimit(ctx, "mcp", `tool:${name}`, 120, 60);
        void repositories.payments?.recordUsage({ workspaceId: ctx.workspaceId, meter: "protocol_call", units: 1, resourceId: "usage:protocol_call" })?.catch(() => undefined);
        try {
          const data = await dispatchTool(name, args, toolCtx);
          return jsonRpcResult(id, { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
        } catch (toolError) {
          // MCP convention: tool-level failures come back as a result with
          // isError=true (not a protocol error), so the model can react.
          const mapped = mapProtocolError(toolError);
          return jsonRpcResult(id, { content: [{ type: "text", text: mapped.message }], isError: true });
        }
      }
      return jsonRpcError(id, -32601, `Method not found: ${method}`);
    }

    // ---- Legacy { tool, input } -------------------------------------------
    const tool: string = payload.tool;
    const input = payload.input ?? {};
    await services.guards.consumeRateLimit(ctx, "mcp", `tool:${tool}`, 120, 60);
    void repositories.payments?.recordUsage({ workspaceId: ctx.workspaceId, meter: "protocol_call", units: 1, resourceId: "usage:protocol_call" })?.catch(() => undefined);
    const data = await dispatchTool(tool, input, toolCtx);
    return NextResponse.json({ ok: true, data, requestId });
  } catch (error) {
    if (isJsonRpc) {
      const mapped = mapProtocolError(error);
      return jsonRpcError(payload?.id ?? null, -32000, mapped.message, mapped.status);
    }
    const mapped = mapProtocolError(error);
    return NextResponse.json(mcpErrorPayload(error, requestId), { status: mapped.status });
  }
}

// MCP clients may probe with GET (some transports expect a 405/406 or an SSE
// stream). We don't offer a server-initiated SSE stream, so advertise that
// only POST is supported.
export function GET() {
  return NextResponse.json({ jsonrpc: "2.0", error: { code: -32000, message: "This MCP endpoint uses POST (Streamable HTTP). Send JSON-RPC 2.0 requests." } }, { status: 405 });
}
