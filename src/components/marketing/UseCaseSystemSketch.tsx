// Tiny inline animated SVG that hints at the system being built in a
// use-case detail page. Three nodes, two pipes, all labelled. The pipes
// draw on with a stroke animation that respects reduced motion.

interface UseCaseSystemSketchProps {
  nodes: readonly [string, string, string];
}

export function UseCaseSystemSketch({ nodes }: UseCaseSystemSketchProps) {
  return (
    <div
      className="surface-subtle rounded-3xl border border-black/[0.06] p-6 sm:p-10"
      role="img"
      aria-label={`System sketch: ${nodes.join(", then ")}.`}
    >
      <svg
        viewBox="0 0 480 160"
        className="block w-full h-auto"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="usc-sketch-grid"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 16 0 L 0 0 0 16"
              fill="none"
              stroke="rgba(0,0,0,0.04)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="480" height="160" fill="url(#usc-sketch-grid)" rx="12" />

        {/* pipes */}
        <path
          className="pipes-edge-stream"
          d="M 130 80 C 170 80, 190 80, 220 80"
          stroke="#4F46E5"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          className="pipes-edge-stream"
          d="M 290 80 C 330 80, 350 80, 380 80"
          stroke="#4F46E5"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* node 1 */}
        <g className="pipes-node-arrival">
          <rect
            x="40"
            y="58"
            width="90"
            height="44"
            rx="8"
            fill="white"
            stroke="#4F46E5"
            strokeWidth="1.25"
          />
          <circle cx="54" cy="80" r="3.5" fill="#4F46E5" />
          <text x="64" y="78" fontSize="11" fontWeight="600" fill="#111">
            {nodes[0]}
          </text>
          <text x="64" y="92" fontSize="9" fill="#8E8E93">
            agent
          </text>
        </g>

        {/* node 2 */}
        <g className="pipes-node-arrival">
          <rect
            x="200"
            y="58"
            width="90"
            height="44"
            rx="8"
            fill="white"
            stroke="#4F46E5"
            strokeWidth="1.25"
          />
          <circle cx="214" cy="80" r="3.5" fill="#4F46E5" />
          <text x="224" y="78" fontSize="11" fontWeight="600" fill="#111">
            {nodes[1]}
          </text>
          <text x="224" y="92" fontSize="9" fill="#8E8E93">
            agent
          </text>
        </g>

        {/* node 3 */}
        <g className="pipes-node-arrival">
          <rect
            x="360"
            y="58"
            width="90"
            height="44"
            rx="8"
            fill="white"
            stroke="#4F46E5"
            strokeWidth="1.25"
          />
          <circle cx="374" cy="80" r="3.5" fill="#4F46E5" />
          <text x="384" y="78" fontSize="11" fontWeight="600" fill="#111">
            {nodes[2]}
          </text>
          <text x="384" y="92" fontSize="9" fill="#8E8E93">
            agent
          </text>
        </g>
      </svg>
      <p className="mt-5 t-caption text-[#8E8E93] text-center">
        The graph the agent built. Typed nodes. Typed pipes. The map your team
        reviews.
      </p>
    </div>
  );
}
