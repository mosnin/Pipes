import type { Pipe, Port, System, ValidationIssue, ValidationReport, Node } from "@/domain/pipes_schema_v1/schema";

export type ValidationSeverity = "info" | "warning" | "error";

function issue(systemId: string, data: Omit<ValidationIssue, "id" | "systemId">): ValidationIssue {
  return {
    id: `issue_${Math.random().toString(36).slice(2, 9)}`,
    systemId,
    ...data
  };
}

export function validateSystem(system: System, nodes: Node[], ports: Port[], pipes: Pipe[]): ValidationReport {
  const issues: ValidationIssue[] = [];

  const systemNodes = nodes.filter((node) => node.systemId === system.id);
  const portMap = new Map(ports.map((port) => [port.id, port]));

  for (const node of systemNodes) {
    const nodePorts = ports.filter((port) => port.nodeId === node.id);
    const hasInput = nodePorts.some((port) => port.direction === "input");
    const hasOutput = nodePorts.some((port) => port.direction === "output");

    if (!hasInput && node.type !== "Input" && node.type !== "Trigger") {
      issues.push(
        issue(system.id, {
          severity: "warning",
          code: "missing_required_inputs",
          message: `${node.title} has no input ports.`,
          nodeId: node.id
        })
      );
    }

    if (!hasOutput && node.type !== "Output" && node.type !== "Monitor") {
      issues.push(
        issue(system.id, {
          severity: "warning",
          code: "missing_outputs",
          message: `${node.title} has no output ports.`,
          nodeId: node.id
        })
      );
    }
  }

  const connectedNodeIds = new Set<string>();

  for (const p of pipes) {
    const fromPort = portMap.get(p.fromPortId);
    const toPort = portMap.get(p.toPortId);

    if (!fromPort || !toPort) continue;

    connectedNodeIds.add(fromPort.nodeId);
    connectedNodeIds.add(toPort.nodeId);

    if (fromPort.direction !== "output" || toPort.direction !== "input") {
      issues.push(
        issue(system.id, {
          severity: "error",
          code: "incompatible_port_direction",
          message: "Pipe direction must connect output to input.",
          pipeId: p.id
        })
      );
    }

    if (fromPort.dataType !== "any" && toPort.dataType !== "any" && fromPort.dataType !== toPort.dataType) {
      issues.push(
        issue(system.id, {
          severity: "error",
          code: "incompatible_port_types",
          message: `Pipe ${p.id} connects incompatible data types (${fromPort.dataType} -> ${toPort.dataType}).`,
          pipeId: p.id
        })
      );
    }
  }

  for (const node of systemNodes) {
    if (!connectedNodeIds.has(node.id) && node.type !== "Annotation") {
      issues.push(
        issue(system.id, {
          severity: "warning",
          code: "orphan_node",
          message: `${node.title} is not connected.`,
          nodeId: node.id
        })
      );
    }
  }

  const adjacency = new Map<string, string[]>();
  for (const node of systemNodes) adjacency.set(node.id, []);

  for (const p of pipes) {
    const fromPort = portMap.get(p.fromPortId);
    const toPort = portMap.get(p.toPortId);
    if (!fromPort || !toPort) continue;
    adjacency.get(fromPort.nodeId)?.push(toPort.nodeId);
  }

  const starts = systemNodes.filter((n) => n.type === "Input" || n.type === "Trigger");
  const reachable = new Set<string>();

  const walk = (nodeId: string) => {
    if (reachable.has(nodeId)) return;
    reachable.add(nodeId);
    adjacency.get(nodeId)?.forEach(walk);
  };

  starts.forEach((s) => walk(s.id));

  for (const node of systemNodes) {
    if (!reachable.has(node.id) && node.type !== "Annotation") {
      issues.push(
        issue(system.id, {
          severity: "warning",
          code: "unreachable_node",
          message: `${node.title} is unreachable from any input or trigger.`,
          nodeId: node.id
        })
      );
    }
  }

  const seen = new Set<string>();
  const stack = new Set<string>();

  const hasCycle = (nodeId: string): boolean => {
    if (stack.has(nodeId)) return true;
    if (seen.has(nodeId)) return false;
    seen.add(nodeId);
    stack.add(nodeId);
    for (const next of adjacency.get(nodeId) ?? []) {
      if (hasCycle(next)) return true;
    }
    stack.delete(nodeId);
    return false;
  };

  for (const node of systemNodes) {
    if (hasCycle(node.id) && node.type !== "Loop") {
      issues.push(
        issue(system.id, {
          severity: "error",
          code: "invalid_cycle",
          message: "Cycle detected outside loop node boundaries.",
          nodeId: node.id
        })
      );
      break;
    }
  }

  for (const node of systemNodes.filter((n) => n.type === "Subsystem")) {
    const hasInterface = ports.some((port) => port.nodeId === node.id && port.required);
    if (!hasInterface) {
      issues.push(
        issue(system.id, {
          severity: "warning",
          code: "incomplete_subsystem_interface",
          message: `${node.title} is missing required interface ports.`,
          nodeId: node.id
        })
      );
    }
  }

  return {
    id: `report_${system.id}`,
    systemId: system.id,
    generatedAt: new Date().toISOString(),
    issues,
    isValid: issues.every((item) => item.severity !== "error")
  };
}
