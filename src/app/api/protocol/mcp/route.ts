import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getProtocolContext, requireCapability } from "@/lib/protocol/auth";
import { ProtocolError, mapProtocolError, mcpErrorPayload } from "@/lib/protocol/errors";

type MCPRequest = { tool: string; input?: Record<string, any> };

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const payload = (await request.json()) as MCPRequest;
    const { ctx, services } = await getProtocolContext(request);
    await services.guards.consumeRateLimit(ctx, "mcp", `tool:${payload.tool}`, 120, 60);
    const input = payload.input ?? {};

    if (payload.tool === "list_systems") {
      requireCapability(ctx, "systems:read");
      return NextResponse.json({ ok: true, data: await services.systems.list(ctx), requestId });
    }
    if (payload.tool === "get_system") {
      requireCapability(ctx, "systems:read", input.systemId);
      return NextResponse.json({ ok: true, data: await services.systems.getBundle(ctx, input.systemId), requestId });
    }
    if (payload.tool === "export_system_schema") {
      requireCapability(ctx, "schema:read", input.systemId);
      return NextResponse.json({ ok: true, data: await services.schema.export(ctx, input.systemId), requestId });
    }
    if (payload.tool === "list_templates") {
      requireCapability(ctx, "templates:read");
      return NextResponse.json({ ok: true, data: services.templates.list(), requestId });
    }
    if (payload.tool === "instantiate_template") {
      requireCapability(ctx, "templates:instantiate");
      const data = await services.templates.instantiate(ctx, input.templateId, input.name, input.params);
      await services.protocol.writeAudit(ctx, { action: "protocol.template.instantiate", targetType: "template", targetId: input.templateId, outcome: "success", metadata: JSON.stringify({ transport: "mcp", requestId, tool: payload.tool }) });
      return NextResponse.json({ ok: true, data, requestId });
    }
    if (payload.tool === "create_system_from_schema") {
      requireCapability(ctx, "import:write");
      const data = await services.importExport.importSchema(ctx, input.canonical, "new");
      await services.protocol.writeAudit(ctx, { action: "protocol.schema.import", targetType: "schema", outcome: "success", metadata: JSON.stringify({ transport: "mcp", requestId, tool: payload.tool }) });
      return NextResponse.json({ ok: true, data, requestId });
    }
    if (payload.tool === "create_version") {
      requireCapability(ctx, "versions:write", input.systemId);
      await services.versions.create(ctx, input.systemId, input.name ?? "MCP snapshot");
      await services.protocol.writeAudit(ctx, { action: "protocol.version.create", targetType: "system", targetId: input.systemId, systemId: input.systemId, outcome: "success", metadata: JSON.stringify({ transport: "mcp", requestId, tool: payload.tool }) });
      return NextResponse.json({ ok: true, data: { ok: true }, requestId });
    }
    if (payload.tool === "apply_graph_actions") {
      requireCapability(ctx, "graph:write", input.systemId);
      const actions = Array.isArray(input.actions) ? input.actions : [input.action].filter(Boolean);
      const results: unknown[] = [];
      for (const action of actions) {
        results.push(await services.graph.mutate(ctx, action));
      }
      const data = { results, count: results.length };
      await services.protocol.writeAudit(ctx, { action: `protocol.graph.batch_mutate`, targetType: "system", targetId: input.systemId, systemId: input.systemId, outcome: "success", metadata: JSON.stringify({ transport: "mcp", requestId, tool: payload.tool, actionCount: results.length }) });
      return NextResponse.json({ ok: true, data, requestId });
    }
    if (payload.tool === "add_comment") {
      requireCapability(ctx, "comments:write", input.systemId);
      await services.comments.add(ctx, { systemId: input.systemId, body: input.body, nodeId: input.nodeId });
      await services.protocol.writeAudit(ctx, { action: "protocol.comment.add", targetType: "system", targetId: input.systemId, systemId: input.systemId, outcome: "success", metadata: JSON.stringify({ transport: "mcp", requestId, tool: payload.tool }) });
      return NextResponse.json({ ok: true, data: { ok: true }, requestId });
    }
    if (payload.tool === "get_validation_report") {
      requireCapability(ctx, "validation:read", input.systemId);
      const bundle = await services.systems.getBundle(ctx, input.systemId);
      return NextResponse.json({ ok: true, data: { nodes: bundle.nodes.length, pipes: bundle.pipes.length }, requestId });
    }
    if (payload.tool === "export_subsystem_blueprint") {
      requireCapability(ctx, "graph:write", input.systemId);
      const { SubsystemBlueprintService } = await import("@/domain/subsystem_blueprint/service");
      const { repositories } = await (await import("@/lib/composition/server")).getServerApp();
      const data = await new SubsystemBlueprintService(repositories).export(ctx, { systemId: input.systemId, subsystemNodeId: input.subsystemNodeId, name: input.name });
      await services.protocol.writeAudit(ctx, { action: "protocol.blueprint.export", targetType: "system", targetId: input.systemId, systemId: input.systemId, outcome: "success", metadata: JSON.stringify({ transport: "mcp", requestId, tool: payload.tool }) });
      return NextResponse.json({ ok: true, data, requestId });
    }
    if (payload.tool === "list_blueprints") {
      requireCapability(ctx, "systems:read");
      const { SubsystemBlueprintService } = await import("@/domain/subsystem_blueprint/service");
      const { repositories } = await (await import("@/lib/composition/server")).getServerApp();
      const data = await new SubsystemBlueprintService(repositories).list(ctx);
      return NextResponse.json({ ok: true, data, requestId });
    }
    if (payload.tool === "instantiate_blueprint") {
      requireCapability(ctx, "graph:write", input.targetSystemId);
      const { SubsystemBlueprintService } = await import("@/domain/subsystem_blueprint/service");
      const { repositories } = await (await import("@/lib/composition/server")).getServerApp();
      const data = await new SubsystemBlueprintService(repositories).instantiate(ctx, { blueprintId: input.blueprintId, targetSystemId: input.targetSystemId, offsetX: input.offsetX, offsetY: input.offsetY });
      await services.protocol.writeAudit(ctx, { action: "protocol.blueprint.instantiate", targetType: "system", targetId: input.targetSystemId, systemId: input.targetSystemId, outcome: "success", metadata: JSON.stringify({ transport: "mcp", requestId, tool: payload.tool }) });
      return NextResponse.json({ ok: true, data, requestId });
    }
    if (payload.tool === "learn_patterns") {
      requireCapability(ctx, "versions:write", input.systemId);
      const { PatternLearningService } = await import("@/domain/services/pattern_learning");
      const { repositories } = await (await import("@/lib/composition/server")).getServerApp();
      const data = await new PatternLearningService(repositories).learnFromSystem(ctx, input.systemId);
      return NextResponse.json({ ok: true, data, requestId });
    }
    if (payload.tool === "list_patterns") {
      requireCapability(ctx, "systems:read");
      const { PatternLearningService } = await import("@/domain/services/pattern_learning");
      const { repositories } = await (await import("@/lib/composition/server")).getServerApp();
      const data = await new PatternLearningService(repositories).listPatterns(ctx, input.systemId);
      return NextResponse.json({ ok: true, data, requestId });
    }
    if (payload.tool === "describe_tools") {
      const tools = [
        { name: "list_systems", capability: "systems:read", description: "List all systems in the workspace." },
        { name: "get_system", capability: "systems:read", description: "Get full system bundle including nodes and pipes." },
        { name: "export_system_schema", capability: "schema:read", description: "Export canonical pipes_schema_v1 JSON." },
        { name: "list_templates", capability: "templates:read", description: "List available starter templates." },
        { name: "instantiate_template", capability: "templates:instantiate", description: "Create a new system from a template." },
        { name: "create_system_from_schema", capability: "import:write", description: "Import a pipes_schema_v1 JSON as a new system." },
        { name: "create_version", capability: "versions:write", description: "Snapshot the current system state." },
        { name: "apply_graph_actions", capability: "graph:write", description: "Apply one or many graph mutations (actions: addNode|updateNode|deleteNode|addPipe|deletePipe). Accepts single action or actions[] array." },
        { name: "add_comment", capability: "comments:write", description: "Add a comment to a system or node." },
        { name: "get_validation_report", capability: "validation:read", description: "Get node/pipe count and basic validation for a system." },
        { name: "export_subsystem_blueprint", capability: "graph:write", description: "Export a subsystem node as a reusable blueprint." },
        { name: "list_blueprints", capability: "systems:read", description: "List all saved subsystem blueprints in the workspace." },
        { name: "instantiate_blueprint", capability: "graph:write", description: "Instantiate a saved subsystem blueprint into a target system." },
        { name: "describe_tools", capability: null, description: "List all available MCP tools and their required capabilities." },
      ];
      return NextResponse.json({ ok: true, data: { tools }, requestId });
    }

    throw new ProtocolError("NOT_FOUND", "Unknown MCP tool.", 404);
  } catch (error) {
    const mapped = mapProtocolError(error);
    return NextResponse.json(mcpErrorPayload(error, requestId), { status: mapped.status });
  }
}
