import { createBoundedServices } from "@/domain/services/bounded";
import { createMockRepositories } from "@/lib/repositories/mock";

const repos = createMockRepositories();
const services = createBoundedServices(repos);

export const pipesService = {
  ensureProvisioned: repos.users.provision,
  listSystems: services.systems.list.bind(services.systems),
  createSystem: services.systems.create.bind(services.systems),
  getSystemGraph: services.systems.getBundle.bind(services.systems),
  archiveSystem: services.systems.archive.bind(services.systems),
  addNode: (ctx: any, systemId: string, input: any) => services.graph.mutate(ctx, { action: "addNode", systemId, ...input }),
  updateNode: (ctx: any, nodeId: string, patch: any) => services.graph.mutate(ctx, { action: "updateNode", nodeId, ...patch }),
  deleteNode: (ctx: any, nodeId: string) => services.graph.mutate(ctx, { action: "deleteNode", nodeId }),
  addPipe: (ctx: any, systemId: string, fromNodeId: string, toNodeId: string) => services.graph.mutate(ctx, { action: "addPipe", systemId, fromNodeId, toNodeId }),
  deletePipe: (ctx: any, pipeId: string) => services.graph.mutate(ctx, { action: "deletePipe", pipeId }),
  addComment: (ctx: any, systemId: string, body: string, nodeId?: string) => services.comments.add(ctx, { systemId, body, nodeId }),
  upsertPresence: (ctx: any, systemId: string, selectedNodeId?: string) => services.presence.upsert(ctx, { systemId, selectedNodeId }),
  listPresence: (ctx: any, systemId: string) => services.presence.list(ctx, systemId),
  listVersions: services.versions.list.bind(services.versions),
  createVersion: services.versions.create.bind(services.versions),
  restoreVersion: services.versions.restore.bind(services.versions),
  exportSchema: services.schema.export.bind(services.schema),
  addCollaborator: (ctx: any, email: string, role: any) => services.collaboration.invite(ctx, email, role)
};
