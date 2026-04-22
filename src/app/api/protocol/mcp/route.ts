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
      const data = await services.templates.instantiate(ctx, input.templateId, input.name);
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
      const data = await services.graph.mutate(ctx, input.action);
      await services.protocol.writeAudit(ctx, { action: `protocol.graph.${input.action?.action ?? "mutate"}`, targetType: "system", targetId: input.systemId, systemId: input.systemId, outcome: "success", metadata: JSON.stringify({ transport: "mcp", requestId, tool: payload.tool }) });
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

    throw new ProtocolError("NOT_FOUND", "Unknown MCP tool.", 404);
  } catch (error) {
    const mapped = mapProtocolError(error);
    return NextResponse.json(mcpErrorPayload(error, requestId), { status: mapped.status });
  }
}
