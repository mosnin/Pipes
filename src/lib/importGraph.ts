"use client";

// Shared utility: converts an AiSystemDraft into a LooperSchemaV1 JSON payload
// and POSTs it to /api/import/system, returning the new systemId on success.

import { toast } from "sonner";
import type { AiSystemDraftSchema } from "@/lib/ai";
import type { z } from "zod";

type AiDraft = z.infer<typeof AiSystemDraftSchema>;

function uid(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export async function importGraphAsLoop(draft: AiDraft): Promise<string | null> {
  const id = toast.loading("Importing as new loop...");
  try {
    const now = new Date().toISOString();
    const systemId = `sys_${uid()}`;
    const userId = "user_import";
    const workspaceId = "ws_import";

    // Build nodes with correct LooperSchemaV1 NodeSchema shape
    const nodes = draft.nodes.map((n) => ({
      id: `node_${n.id}`,
      systemId,
      type: n.type,
      title: n.title,
      description: n.description ?? "",
      position: { x: n.x, y: n.y },
      config: {},
      portIds: [],
    }));

    // One output port per source node, one input port per target node per pipe
    const nodeIdMap = Object.fromEntries(draft.nodes.map((n) => [n.id, `node_${n.id}`]));
    const ports: object[] = [];
    const pipes: object[] = [];
    const droppedPipes: string[] = [];

    draft.pipes.forEach((p, i) => {
      const fromNodeId = nodeIdMap[p.fromNodeId];
      const toNodeId = nodeIdMap[p.toNodeId];
      if (!fromNodeId || !toNodeId) {
        droppedPipes.push(`${p.fromNodeId} → ${p.toNodeId}`);
        return;
      }
      const outPortId = `pout_${i}_${uid()}`;
      const inPortId = `pin_${i}_${uid()}`;
      ports.push({
        id: outPortId,
        nodeId: fromNodeId,
        key: "output",
        label: "Output",
        direction: "output",
        dataType: "any",
        required: false,
      });
      ports.push({
        id: inPortId,
        nodeId: toNodeId,
        key: "input",
        label: "Input",
        direction: "input",
        dataType: "any",
        required: false,
      });
      pipes.push({
        id: `pipe_${i}_${uid()}`,
        systemId,
        fromPortId: outPortId,
        toPortId: inPortId,
      });
    });

    // Full LooperSchemaV1 document — all arrays required by the schema
    const schema = {
      version: "looper_schema_v1",
      users: [],
      workspaces: [],
      systems: [
        {
          id: systemId,
          workspaceId,
          name: draft.systemName,
          description: draft.description ?? "",
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
          nodeIds: nodes.map((n) => n.id),
          portIds: ports.map((p) => (p as { id: string }).id),
          pipeIds: pipes.map((p) => (p as { id: string }).id),
          groupIds: [],
          annotationIds: [],
          commentIds: [],
          assetIds: [],
          snippetIds: [],
          subsystemNodeIds: [],
        },
      ],
      views: [],
      nodes,
      ports,
      pipes,
      groups: [],
      annotations: [],
      comments: [],
      assets: [],
      snippets: [],
      templates: [],
      versions: [],
      invites: [],
      roles: [],
      agentTokens: [],
      validationReports: [],
      simulationRuns: [],
    };

    // importSchema expects body.schema to be a JSON string (it calls JSON.parse internally)
    const res = await fetch("/api/import/system", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schema: JSON.stringify(schema), mode: "new" }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? "Import failed");
    if (!json.data?.ok) throw new Error((json.data?.diagnostics ?? []).join("; ") || "Import failed");

    const importedSystemId: string = json.data?.systemId ?? "";
    if (droppedPipes.length > 0) {
      toast.warning(`${droppedPipes.length} pipe(s) skipped — referenced missing nodes`, {
        description: droppedPipes.slice(0, 3).join(", ") + (droppedPipes.length > 3 ? "…" : ""),
      });
    }
    toast.success("Loop created!", { id, description: draft.systemName });
    return importedSystemId || null;
  } catch (err) {
    toast.error("Import failed", { id, description: (err as Error).message });
    return null;
  }
}
