import { serializePipesSchema } from "@/domain/pipes_schema_v1/serde";

export function serializeConvexBundle(bundle: any): string {
  const system = bundle.system;
  const nodes = bundle.nodes ?? [];
  const pipes = bundle.pipes ?? [];

  return serializePipesSchema({
    version: "pipes_schema_v1",
    users: [],
    workspaces: [],
    systems: [{
      id: String(system._id), workspaceId: String(system.workspaceId), name: system.name, description: system.description, createdBy: String(system.createdBy), createdAt: system.createdAt, updatedAt: system.updatedAt,
      nodeIds: nodes.map((n: any) => String(n._id)), portIds: nodes.flatMap((n: any) => n.portIds), pipeIds: pipes.map((p: any) => String(p._id)), groupIds: [], annotationIds: [], commentIds: [], assetIds: [], snippetIds: [], subsystemNodeIds: []
    }],
    views: [],
    nodes: nodes.map((n: any) => ({ id: String(n._id), systemId: String(n.systemId), type: n.type, title: n.title, description: n.description, position: n.position, config: n.config ?? {}, portIds: n.portIds })),
    ports: nodes.flatMap((n: any) => [
      { id: n.portIds[0] ?? `${n._id}_in`, nodeId: String(n._id), key: "in", label: "in", direction: "input", dataType: "any", required: false },
      { id: n.portIds[1] ?? `${n._id}_out`, nodeId: String(n._id), key: "out", label: "out", direction: "output", dataType: "any", required: false }
    ]),
    pipes: pipes.map((p: any) => ({ id: String(p._id), systemId: String(p.systemId), fromPortId: p.fromPortId, toPortId: p.toPortId })),
    groups: [], annotations: [],
    comments: (bundle.comments ?? []).map((c: any) => ({ id: String(c._id), systemId: String(c.systemId), authorId: String(c.authorId), body: c.body, targets: [{ type: c.nodeId ? "Node" : "System", id: c.nodeId ? String(c.nodeId) : String(c.systemId) }], createdAt: c.createdAt })),
    assets: [], snippets: [], templates: [], versions: (bundle.versions ?? []).map((v: any) => ({ id: String(v._id), systemId: String(v.systemId), name: v.name, createdBy: String(v.authorId), createdAt: v.createdAt, snapshot: v.snapshot })),
    invites: [], roles: [], agentTokens: [], validationReports: [], simulationRuns: []
  });
}
