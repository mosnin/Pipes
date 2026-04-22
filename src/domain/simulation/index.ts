import type { Node, Pipe, Port, SimulationRun, System } from "@/domain/pipes_schema_v1/schema";

type SimulationInput = Record<string, unknown>;

export function simulateSystem(system: System, nodes: Node[], ports: Port[], pipes: Pipe[], input: SimulationInput): SimulationRun {
  const startedAt = new Date().toISOString();
  const portMap = new Map(ports.map((port) => [port.id, port]));
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  const adjacency = new Map<string, string[]>();
  for (const node of nodes.filter((n) => n.systemId === system.id)) adjacency.set(node.id, []);

  for (const pipe of pipes) {
    const from = portMap.get(pipe.fromPortId);
    const to = portMap.get(pipe.toPortId);
    if (!from || !to) continue;
    adjacency.get(from.nodeId)?.push(to.nodeId);
  }

  const startNode = nodes.find((node) => node.systemId === system.id && (node.type === "Input" || node.type === "Trigger"));

  if (!startNode) {
    return {
      id: `sim_${system.id}`,
      systemId: system.id,
      startedAt,
      endedAt: new Date().toISOString(),
      status: "halted",
      input,
      steps: []
    };
  }

  const steps: SimulationRun["steps"] = [];
  const loopGuards = new Map<string, number>();
  let current: Node | undefined = startNode;

  for (let index = 1; index <= 20 && current; index++) {
    steps.push({
      step: index,
      nodeId: current.id,
      summary: `${current.type} node executed: ${current.title}`
    });

    if (current.type === "Decision" || current.type === "Condition") {
      const nextIds = adjacency.get(current.id) ?? [];
      current = nodeMap.get((input.decision === "secondary" ? nextIds[1] : nextIds[0]) ?? "");
      continue;
    }

    if (current.type === "Loop") {
      const count = (loopGuards.get(current.id) ?? 0) + 1;
      loopGuards.set(current.id, count);
      if (count > 2) {
        return {
          id: `sim_${system.id}`,
          systemId: system.id,
          startedAt,
          endedAt: new Date().toISOString(),
          status: "halted",
          input,
          steps
        };
      }
    }

    const nextId = (adjacency.get(current.id) ?? [])[0];
    current = nodeMap.get(nextId ?? "");
  }

  return {
    id: `sim_${system.id}`,
    systemId: system.id,
    startedAt,
    endedAt: new Date().toISOString(),
    status: "success",
    input,
    steps
  };
}
