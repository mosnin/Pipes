import type { Node, Pipe, Port, SimulationRun, System } from "@/domain/looper_schema_v1/schema";

type SimulationInput = Record<string, unknown>;

const MAX_STEPS = 50;
const MAX_LOOP_ITERATIONS = 3;

// Static dry-run tracer. Walks the graph from the entry node along typed pipes,
// recording the path a single input would take: which branch is chosen at a
// Decision/Condition, how many times a Loop revisits, and which nodes are never
// reached. It does NOT execute node logic or evaluate real data — it traces
// reachability and control flow so a broken or unreachable path shows up before
// you wire anything live.
export function simulateSystem(system: System, nodes: Node[], ports: Port[], pipes: Pipe[], input: SimulationInput): SimulationRun {
  const startedAt = new Date().toISOString();
  const portMap = new Map(ports.map((port) => [port.id, port]));
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const systemNodes = nodes.filter((n) => n.systemId === system.id);

  const adjacency = new Map<string, string[]>();
  for (const node of systemNodes) adjacency.set(node.id, []);
  for (const pipe of pipes) {
    const from = portMap.get(pipe.fromPortId);
    const to = portMap.get(pipe.toPortId);
    if (!from || !to) continue;
    adjacency.get(from.nodeId)?.push(to.nodeId);
  }

  const finish = (
    status: SimulationRun["status"],
    steps: SimulationRun["steps"],
  ): SimulationRun => ({
    id: `sim_${system.id}`,
    systemId: system.id,
    startedAt,
    endedAt: new Date().toISOString(),
    status,
    input,
    steps,
  });

  const startNode = systemNodes.find((node) => node.type === "Input" || node.type === "Trigger");
  if (!startNode) {
    return finish("halted", []);
  }

  const steps: SimulationRun["steps"] = [];
  const loopGuards = new Map<string, number>();
  let current: Node | undefined = startNode;
  let status: SimulationRun["status"] = "success";

  for (let index = 1; index <= MAX_STEPS && current; index++) {
    const nextIds = adjacency.get(current.id) ?? [];

    if (current.type === "Decision" || current.type === "Condition") {
      const branch = input.decision === "secondary" ? "secondary" : "primary";
      const chosen = branch === "secondary" ? nextIds[1] : nextIds[0];
      steps.push({ step: index, nodeId: current.id, summary: `Branched at ${current.title}: took the ${branch} path.` });
      current = nodeMap.get(chosen ?? "");
      continue;
    }

    if (current.type === "Loop") {
      const count = (loopGuards.get(current.id) ?? 0) + 1;
      loopGuards.set(current.id, count);
      steps.push({ step: index, nodeId: current.id, summary: `Loop ${current.title}: iteration ${count}.` });
      if (count > MAX_LOOP_ITERATIONS) {
        steps.push({ step: index + 1, nodeId: current.id, summary: `Stopped: ${current.title} exceeded ${MAX_LOOP_ITERATIONS} traced iterations (add a stop condition).` });
        status = "halted";
        current = undefined;
        break;
      }
      current = nodeMap.get(nextIds[0] ?? "");
      continue;
    }

    const verb = current.type === "Output" ? "Reached output" : "Traced";
    steps.push({ step: index, nodeId: current.id, summary: `${verb} ${current.type} "${current.title}".` });

    if (current.type === "Output" || nextIds.length === 0) {
      current = undefined;
      break;
    }
    current = nodeMap.get(nextIds[0] ?? "");
  }

  return finish(status, steps);
}
