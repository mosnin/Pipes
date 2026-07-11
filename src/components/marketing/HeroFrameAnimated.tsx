"use client";

// Animated hero frame. A 4-second SVG + CSS keyframe loop showing both halves
// of the magic moment: build (left) and read-back (right). No JS animation
// libs, no assets, pure SVG + CSS. Respects prefers-reduced-motion by
// rendering the static final state.
//
// Beats (4 s loop):
//   0.0 - 1.0 s: text types into the prompt input
//   1.0 - 1.7 s: Planner agent node appears + pulses
//   1.7 - 2.4 s: Coder agent node appears + pulses
//   2.4 - 2.8 s: pipe edge draws between them
//   2.8 - 3.5 s: read-back chrome on the right shows architecture summary
//   3.5 - 4.0 s: hold, then loop seamlessly

const ANIMATION_CSS = `
.pipes-hero-anim { animation-duration: 4s; animation-iteration-count: infinite; animation-timing-function: linear; }

@keyframes pipes-hero-typing {
  0%   { width: 0; }
  25%  { width: 100%; }
  100% { width: 100%; }
}

@keyframes pipes-hero-caret {
  0%, 25%   { opacity: 1; }
  26%, 100% { opacity: 0; }
}

@keyframes pipes-hero-node-planner {
  0%, 25%  { opacity: 0; transform: scale(0.92); }
  30%, 42% { opacity: 1; transform: scale(1); }
  100%     { opacity: 1; transform: scale(1); }
}

@keyframes pipes-hero-node-coder {
  0%, 42%  { opacity: 0; transform: scale(0.92); }
  47%, 60% { opacity: 1; transform: scale(1); }
  100%     { opacity: 1; transform: scale(1); }
}

@keyframes pipes-hero-edge {
  0%, 60% { stroke-dashoffset: 80; opacity: 0; }
  62%     { opacity: 1; }
  70%     { stroke-dashoffset: 0; opacity: 1; }
  100%    { stroke-dashoffset: 0; opacity: 1; }
}

@keyframes pipes-hero-readback {
  0%, 70% { opacity: 0; transform: translateY(4px); }
  75%     { opacity: 1; transform: translateY(0); }
  100%    { opacity: 1; transform: translateY(0); }
}

@keyframes pipes-hero-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
  50%      { box-shadow: 0 0 0 4px rgba(79, 70, 229, 0); }
}

@media (prefers-reduced-motion: no-preference) {
  .pipes-hero-typing-text { animation: pipes-hero-typing 4s steps(40, end) infinite; }
  .pipes-hero-caret       { animation: pipes-hero-caret 4s linear infinite; }
  .pipes-hero-planner     { animation: pipes-hero-node-planner 4s linear infinite; transform-origin: center; transform-box: fill-box; }
  .pipes-hero-coder       { animation: pipes-hero-node-coder 4s linear infinite; transform-origin: center; transform-box: fill-box; }
  .pipes-hero-edge        { animation: pipes-hero-edge 4s linear infinite; }
  .pipes-hero-readback    { animation: pipes-hero-readback 4s linear infinite; }
}
`;

const PROMPT_TEXT = "Planner agent reads tickets, hands off to a coder agent.";
const READBACK_LINES = [
  "Planner agent.",
  "Coder agent.",
  "Pipe between them.",
] as const;

export function HeroFrameAnimated() {
  return (
    <div
      className="surface-muted relative w-full overflow-hidden rounded-[12px] border border-black/[0.08] shadow-sm-token"
      role="img"
      aria-label="The agent reads a one-sentence prompt and draws the Planner and Coder nodes on the canvas, then summarizes the architecture back to you."
      style={{ aspectRatio: "16 / 9" }}
    >
      <style>{ANIMATION_CSS}</style>

      {/* Top chrome */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center gap-2 border-b border-black/[0.06] bg-white px-3 py-2">
        <span className="t-label font-semibold text-[#111]" style={{ fontSize: 12 }}>
          Pipes
        </span>
        <span className="t-caption text-[#8E8E93]" style={{ fontSize: 11 }}>
          sys_8a72
        </span>
        <span
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-black/[0.06] bg-[#F5F5F7] px-2 py-0.5 t-caption text-[#3C3C43]"
          style={{ fontSize: 10 }}
        >
          Building...
        </span>
      </div>

      {/* Two-column layout: build on the left, read-back on the right */}
      <div className="absolute inset-0 grid grid-cols-2 gap-3 px-4 pt-12 pb-4">
        {/* LEFT: typed prompt + canvas with two nodes + edge */}
        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-black/[0.08] bg-white px-3 py-2 overflow-hidden">
            <p className="t-caption text-[#8E8E93]" style={{ fontSize: 10 }}>
              You typed
            </p>
            <div className="mt-1 flex items-center gap-0">
              <span
                className="pipes-hero-typing-text inline-block whitespace-nowrap overflow-hidden t-label text-[#111]"
                style={{ fontSize: 11.5, width: "100%" }}
              >
                {PROMPT_TEXT}
              </span>
              <span
                className="pipes-hero-caret inline-block w-px h-3 ml-px bg-violet-500"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* SVG canvas — two nodes + an edge */}
          <div className="relative flex-1 rounded-md border border-black/[0.08] bg-white overflow-hidden">
            <svg
              viewBox="0 0 320 160"
              preserveAspectRatio="xMidYMid meet"
              className="absolute inset-0 w-full h-full"
              aria-hidden="true"
            >
              {/* subtle grid */}
              <defs>
                <pattern id="hero-grid" width="16" height="16" patternUnits="userSpaceOnUse">
                  <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="320" height="160" fill="url(#hero-grid)" />

              {/* edge */}
              <path
                className="pipes-hero-edge"
                d="M 110 80 C 150 80, 170 80, 210 80"
                stroke="#4F46E5"
                strokeWidth="1.5"
                fill="none"
                strokeDasharray="80"
                strokeDashoffset="80"
                strokeLinecap="round"
              />

              {/* Planner node */}
              <g className="pipes-hero-planner">
                <rect
                  x="40"
                  y="62"
                  width="70"
                  height="36"
                  rx="6"
                  fill="white"
                  stroke="#4F46E5"
                  strokeWidth="1.25"
                />
                <circle cx="52" cy="80" r="3" fill="#4F46E5" />
                <text
                  x="60"
                  y="78"
                  fontSize="9"
                  fontWeight="600"
                  fill="#111"
                >
                  Planner
                </text>
                <text x="60" y="89" fontSize="7.5" fill="#8E8E93">
                  agent
                </text>
              </g>

              {/* Coder node */}
              <g className="pipes-hero-coder">
                <rect
                  x="210"
                  y="62"
                  width="70"
                  height="36"
                  rx="6"
                  fill="white"
                  stroke="#4F46E5"
                  strokeWidth="1.25"
                />
                <circle cx="222" cy="80" r="3" fill="#4F46E5" />
                <text
                  x="230"
                  y="78"
                  fontSize="9"
                  fontWeight="600"
                  fill="#111"
                >
                  Coder
                </text>
                <text x="230" y="89" fontSize="7.5" fill="#8E8E93">
                  agent
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* RIGHT: read-back chrome */}
        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-black/[0.08] bg-white px-3 py-2">
            <p className="t-caption text-[#8E8E93]" style={{ fontSize: 10 }}>
              Pipes built
            </p>
            <div className="pipes-hero-readback mt-1 flex flex-col gap-1.5">
              {READBACK_LINES.map((line) => (
                <div key={line} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full bg-violet-500"
                  />
                  <p className="t-mono t-caption text-[#3C3C43]" style={{ fontSize: 11 }}>
                    {line}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pipes-hero-readback flex-1 rounded-md border border-black/[0.08] bg-[#FAFAFA] px-3 py-2.5">
            <p className="t-caption text-[#8E8E93]" style={{ fontSize: 10 }}>
              Claude reads it back
            </p>
            <p className="mt-1.5 t-label text-[#111]" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
              Planner agent. Coder agent. Pipe between them. Same graph your team reviews.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
