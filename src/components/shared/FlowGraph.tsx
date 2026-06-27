"use client";

import { getNodeTypeConfig } from "@/lib/nodeTypeConfig";

export type FlowNode = { id: string; type: string; title: string; x: number; y: number };
export type FlowPipe = { fromNodeId: string; toNodeId: string };

const NODE_W = 164;
const NODE_H = 54;
const PAD = 44;

export function FlowGraph({ nodes, pipes }: { nodes: FlowNode[]; pipes: FlowPipe[] }) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const svgW = Math.max(...xs) + NODE_W + PAD;
  const rawMinY = Math.min(...ys) - NODE_H / 2 - PAD;
  const rawMaxY = Math.max(...ys) + NODE_H / 2 + PAD;
  const svgH = rawMaxY - rawMinY;

  return (
    <div className="overflow-x-auto rounded-xl border border-black/[0.07] bg-[#F9F9FB]">
      <svg
        width={svgW + PAD}
        height={svgH}
        viewBox={`0 ${rawMinY} ${svgW + PAD} ${svgH}`}
        className="block"
        style={{ minWidth: 480 }}
      >
        <defs>
          <marker
            id="fg-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 9 5 L 0 9 z" fill="#C7C7CC" />
          </marker>
        </defs>

        {/* Pipes */}
        {pipes.map((pipe, i) => {
          const from = nodeMap.get(pipe.fromNodeId);
          const to = nodeMap.get(pipe.toNodeId);
          if (!from || !to) return null;
          const sx = from.x + NODE_W;
          const sy = from.y;
          const tx = to.x;
          const ty = to.y;
          const dx = tx - sx;
          const bend = dx > 0 ? Math.min(72, dx * 0.45) : 64;
          return (
            <path
              key={i}
              d={`M ${sx},${sy} C ${sx + bend},${sy} ${tx - bend},${ty} ${tx},${ty}`}
              fill="none"
              stroke="#C7C7CC"
              strokeWidth={1.5}
              markerEnd="url(#fg-arrow)"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const cfg = getNodeTypeConfig(node.type);
          const { x, y } = node;
          const title = node.title.length > 21 ? node.title.slice(0, 19) + "…" : node.title;
          const typeLabel = node.type.length > 13 ? node.type.slice(0, 13) : node.type;
          return (
            <g key={node.id}>
              <rect x={x + 1} y={y - NODE_H / 2 + 2} width={NODE_W} height={NODE_H} rx={10} fill="rgba(0,0,0,0.04)" />
              <rect x={x} y={y - NODE_H / 2} width={NODE_W} height={NODE_H} rx={10} fill={cfg.bgLight} stroke={cfg.color} strokeWidth={1.5} />
              <circle cx={x + 14} cy={y - 9} r={3.5} fill={cfg.color} />
              <text x={x + 25} y={y - 5} fontSize={9} fill={cfg.color} fontFamily="system-ui,-apple-system,sans-serif" fontWeight={700} letterSpacing={0.6}>
                {typeLabel.toUpperCase()}
              </text>
              <text x={x + 14} y={y + 14} fontSize={12.5} fill="#111" fontFamily="system-ui,-apple-system,sans-serif" fontWeight={600}>
                {title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
