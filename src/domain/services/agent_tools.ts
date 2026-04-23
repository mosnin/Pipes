import { z } from "zod";
import { starterTemplates } from "@/domain/templates/catalog";
import { nodeLibraryCatalog } from "@/domain/templates/node_library";
import { validateSystem } from "@/domain/validation";
import { simulateSystem } from "@/domain/simulation";
import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";

export const ToolNameSchema = z.enum([
  "get_system_summary",
  "get_selected_context",
  "get_system_schema",
  "list_templates",
  "search_node_types",
  "get_node_type_details",
  "get_validation_report",
  "run_simulation_summary",
  "create_version_checkpoint",
  "propose_graph_actions",
  "apply_graph_actions",
  "request_approval"
]);

export class AgentToolService {
  constructor(private readonly repos: RepositorySet) {}

  async runTool(ctx: AppContext, systemId: string, toolName: z.infer<typeof ToolNameSchema>, input: Record<string, unknown>) {
    if (toolName === "get_system_summary") {
      const bundle = await this.repos.systems.getBundle(systemId);
      return { system: bundle.system, nodeCount: bundle.nodes.length, pipeCount: bundle.pipes.length };
    }
    if (toolName === "get_selected_context") {
      const bundle = await this.repos.systems.getBundle(systemId);
      const nodeId = String(input.nodeId ?? "");
      return { node: bundle.nodes.find((n) => n.id === nodeId) ?? null, connected: bundle.pipes.filter((p) => p.fromNodeId === nodeId || p.toNodeId === nodeId) };
    }
    if (toolName === "get_system_schema") return this.repos.systems.getBundle(systemId);
    if (toolName === "list_templates") return starterTemplates.map((t) => ({ id: t.id, name: t.name, category: t.category }));
    if (toolName === "search_node_types") {
      const q = String(input.query ?? "").toLowerCase();
      return nodeLibraryCatalog.filter((n) => n.id.toLowerCase().includes(q) || n.title.toLowerCase().includes(q)).slice(0, 12);
    }
    if (toolName === "get_node_type_details") return nodeLibraryCatalog.find((n) => n.id === input.nodeTypeId) ?? null;
    if (toolName === "get_validation_report") {
      const bundle = await this.repos.systems.getBundle(systemId);
      const ports = bundle.nodes.flatMap((node) => [
        node.portIds[0] ? { id: node.portIds[0], nodeId: node.id, key: "in", label: "in", direction: "input", dataType: "any", required: false } : null,
        node.portIds[1] ? { id: node.portIds[1], nodeId: node.id, key: "out", label: "out", direction: "output", dataType: "any", required: false } : null
      ].filter(Boolean)) as any[];
      return validateSystem(bundle.system as never, bundle.nodes as never, ports as never, bundle.pipes as never);
    }
    if (toolName === "run_simulation_summary") {
      const bundle = await this.repos.systems.getBundle(systemId);
      return simulateSystem(bundle.system as never, bundle.nodes as never, bundle.pipes as never);
    }
    return { ok: true, note: "tool acknowledged" };
  }
}
