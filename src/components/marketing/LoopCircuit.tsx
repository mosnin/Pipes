// The hero visual: a real agent loop drawn in the product's own vocabulary —
// the same white node cards, category color bars, and gray pipes the editor
// canvas renders (see ProductMockup). The planner → tool → evaluator cycle is
// the product's core idea; one violet pulse circulates it. Pure SVG + SMIL,
// no client JS. See DESIGN.md: the canvas is the brand.

const CARD_W = 150;
const CARD_H = 46;

const NODES = [
  { id: "trigger", x: 16, y: 60, title: "Trigger", sub: "new request", color: "#7C3AED" },
  { id: "planner", x: 230, y: 40, title: "Planner agent", sub: "decides", color: "#4F46E5" },
  { id: "tool", x: 384, y: 180, title: "Tool call", sub: "executes", color: "#059669" },
  { id: "evaluator", x: 120, y: 220, title: "Evaluator", sub: "checks the result", color: "#0891B2" },
] as const;

type NodeDef = (typeof NODES)[number];

const center = (n: NodeDef) => ({ cx: n.x + CARD_W / 2, cy: n.y + CARD_H / 2 });

// Edge endpoints trimmed to card borders so arrowheads land on the card edge.
const EDGES = [
  // Trigger feeds the loop once.
  { x1: 166, y1: 78, x2: 226, y2: 68 },
  // The cycle: planner → tool → evaluator → planner.
  { x1: 376, y1: 78, x2: 452, y2: 176, cycle: true },
  { x1: 380, y1: 212, x2: 274, y2: 238, cycle: true },
  { x1: 192, y1: 216, x2: 278, y2: 90, cycle: true },
];

// Closed path through the three cycle-node centers; the pulse travels it.
const p = center(NODES[1]);
const t = center(NODES[2]);
const e = center(NODES[3]);
const CYCLE_PATH = `M ${p.cx} ${p.cy} L ${t.cx} ${t.cy} L ${e.cx} ${e.cy} Z`;

export function LoopCircuit() {
  return (
    <svg
      viewBox="0 0 560 320"
      className="h-auto w-full max-w-[540px]"
      role="img"
      aria-label="An agent loop: a trigger feeds a planner agent, which calls a tool; an evaluator checks the result and hands it back to the planner."
    >
      {/* Pipes */}
      {EDGES.map((edge, i) => {
        const angle = Math.atan2(edge.y2 - edge.y1, edge.x2 - edge.x1);
        const deg = (angle * 180) / Math.PI;
        return (
          <g key={i}>
            <line
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke="#E5E5EA"
              strokeWidth="2"
            />
            <polygon
              points={`${edge.x2},${edge.y2 - 5} ${edge.x2 + 10},${edge.y2} ${edge.x2},${edge.y2 + 5}`}
              fill="#D1D1D6"
              transform={`rotate(${deg} ${edge.x2} ${edge.y2})`}
            />
          </g>
        );
      })}

      {/* One violet pulse circulating the cycle — motion with meaning. */}
      <g className="motion-reduce:hidden">
        <circle r="4" fill="#7C3AED">
          <animateMotion dur="4.5s" repeatCount="indefinite" path={CYCLE_PATH} />
        </circle>
        <circle r="8" fill="#7C3AED" opacity="0.18">
          <animateMotion dur="4.5s" repeatCount="indefinite" path={CYCLE_PATH} />
        </circle>
      </g>

      {/* Node cards — the editor's exact recipe. */}
      {NODES.map((n) => (
        <g key={n.id}>
          <rect
            x={n.x}
            y={n.y}
            width={CARD_W}
            height={CARD_H}
            rx={12}
            fill="white"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth="1"
            filter="drop-shadow(0 2px 6px rgba(0,0,0,0.05))"
          />
          <rect x={n.x} y={n.y} width={4} height={CARD_H} rx={2} fill={n.color} />
          <text
            x={n.x + 16}
            y={n.y + 20}
            fontSize="12.5"
            fontWeight="700"
            fill="#111111"
            fontFamily="var(--font-geist-sans), system-ui"
          >
            {n.title}
          </text>
          <text
            x={n.x + 16}
            y={n.y + 35}
            fontSize="10.5"
            fill="#8E8E93"
            fontFamily="var(--font-geist-sans), system-ui"
          >
            {n.sub}
          </text>
        </g>
      ))}
    </svg>
  );
}
