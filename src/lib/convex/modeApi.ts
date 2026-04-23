import { api } from "../../../convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convex/httpClient";

export async function convexListSystems(workspaceId: string) {
  const client = getConvexHttpClient();
  return client.query(api.app.listSystems, { workspaceId: workspaceId as never });
}

export async function convexCreateSystem(workspaceId: string, userId: string, name: string, description: string) {
  const client = getConvexHttpClient();
  return client.mutation(api.app.createSystem, { workspaceId: workspaceId as never, userId: userId as never, name, description });
}

export async function convexArchiveSystem(systemId: string) {
  const client = getConvexHttpClient();
  return client.mutation(api.app.archiveSystem, { systemId: systemId as never });
}

export async function convexSystemBundle(systemId: string) {
  const client = getConvexHttpClient();
  return client.query(api.app.getSystemBundle, { systemId: systemId as never });
}

export async function convexAddNode(systemId: string, type: string, title: string, description: string | undefined, x: number, y: number) {
  const client = getConvexHttpClient();
  return client.mutation(api.app.addNode, { systemId: systemId as never, type, title, description, x, y });
}

export async function convexUpdateNode(nodeId: string, title?: string, description?: string, position?: { x: number; y: number }) {
  const client = getConvexHttpClient();
  return client.mutation(api.app.updateNode, { nodeId: nodeId as never, title, description, x: position?.x, y: position?.y });
}

export async function convexDeleteNode(nodeId: string) {
  const client = getConvexHttpClient();
  return client.mutation(api.app.deleteNode, { nodeId: nodeId as never });
}

export async function convexAddPipe(systemId: string, fromNodeId: string, fromPortId: string, toNodeId: string, toPortId: string) {
  const client = getConvexHttpClient();
  return client.mutation(api.app.addPipe, { systemId: systemId as never, fromNodeId: fromNodeId as never, fromPortId, toNodeId: toNodeId as never, toPortId });
}

export async function convexDeletePipe(pipeId: string) {
  const client = getConvexHttpClient();
  return client.mutation(api.app.deletePipe, { pipeId: pipeId as never });
}

export async function convexAddComment(systemId: string, authorId: string, body: string, nodeId?: string) {
  const client = getConvexHttpClient();
  return client.mutation(api.app.addComment, { systemId: systemId as never, authorId: authorId as never, body, nodeId: nodeId as never });
}

export async function convexAddVersion(systemId: string, authorId: string, name: string, snapshot: string) {
  const client = getConvexHttpClient();
  return client.mutation(api.app.addVersion, { systemId: systemId as never, authorId: authorId as never, name, snapshot });
}

export async function convexUpsertPresence(systemId: string, userId: string, sessionId: string, selectedNodeId?: string, editingTarget?: string, cursor?: { x: number; y: number }) {
  const client = getConvexHttpClient();
  return client.mutation(api.app.upsertPresence, { systemId: systemId as never, userId: userId as never, sessionId, selectedNodeId: selectedNodeId as never, editingTarget, cursorX: cursor?.x, cursorY: cursor?.y });
}

export async function convexAddCollaborator(workspaceId: string, userId: string | undefined, email: string, role: string) {
  const client = getConvexHttpClient();
  return client.mutation(api.app.addCollaborator, { workspaceId: workspaceId as never, userId: userId as never, email, role });
}
