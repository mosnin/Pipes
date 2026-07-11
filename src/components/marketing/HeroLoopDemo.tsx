"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

// The hero's living proof of the promise: a sentence types itself in, then the
// loop assembles — node by node, pipe by pipe — exactly as it does in the
// product. "Describe the loop. It builds itself," shown, not told. Pure SVG +
// timers, one self-contained state machine, cleaned up on unmount, and it
// respects prefers-reduced-motion (renders the finished loop, no motion).
//
// Visual language matches the editor canvas: white node cards, a category
// color bar, hairline gray pipes with arrowheads, one violet pulse.

const PROMPT = "Triage tickets, draft replies, escalate the hard ones.";

const CARD_W = 150;
const CARD_H = 46;

type NodeDef = { id: string; x: number; y: number; title: string; sub: string; color: string; showAt: number };
const NODES: NodeDef[] = [
  { id: "ticket", x: 16, y: 150, title: "New ticket", sub: "trigger", color: "#7C3AED", showAt: 1 },
  { id: "classify", x: 236, y: 108, title: "Classify", sub: "agent", color: "#4F46E5", showAt: 2 },
  { id: "draft", x: 388, y: 250, title: "Draft reply", sub: "agent", color: "#059669", showAt: 3 },
  { id: "evaluate", x: 120, y: 300, title: "Evaluate", sub: "guard", color: "#0891B2", showAt: 4 },
];

type PipeDef = { x1: number; y1: number; x2: number; y2: number; showAt: number };
const PIPES: PipeDef[] = [
  { x1: 168, y1: 170, x2: 232, y2: 132, showAt: 2 }, // ticket → classify
  { x1: 380, y1: 132, x2: 456, y2: 250, showAt: 3 }, // classify → draft
  { x1: 386, y1: 284, x2: 274, y2: 318, showAt: 4 }, // draft → evaluate
  { x1: 190, y1: 300, x2: 280, y2: 150, showAt: 5 }, // evaluate → classify (loop back)
];

const TOTAL_STEPS = 5;

export function HeroLoopDemo() {
  const reduce = useReducedMotion();
  const [chars, setChars] = useState(0);
  const [step, setStep] = useState(0);
  const [caret, setCaret] = useState(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (reduce) {
      setChars(PROMPT.length);
      setStep(TOTAL_STEPS);
      return;
    }
    const schedule = (fn: () => void, ms: number) => {
      const t = setTimeout(fn, ms);
      timers.current.push(t);
    };

    const run = () => {
      setChars(0);
      setStep(0);
      // Type the prompt.
      for (let i = 1; i <= PROMPT.length; i++) schedule(() => setChars(i), 380 + i * 38);
      const afterTyping = 380 + PROMPT.length * 38 + 500;
      // Assemble the loop.
      for (let s = 1; s <= TOTAL_STEPS; s++) schedule(() => setStep(s), afterTyping + s * 560);
      // Hold on the finished loop — it's the hero's actual selling image and the
      // payoff of "it builds itself", so let it dominate the cycle (the violet
      // pulse keeps it alive) before the reveal replays.
      schedule(run, afterTyping + TOTAL_STEPS * 560 + 8000);
    };
    run();

    const blink = setInterval(() => setCaret((c) => !c), 530);
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      clearInterval(blink);
    };
  }, [reduce]);

  const typing = chars < PROMPT.length;
  const cyclePath = (() => {
    const c = (n: NodeDef) => ({ x: n.x + CARD_W / 2, y: n.y + CARD_H / 2 });
    const cl = c(NODES[1]);
    const d = c(NODES[2]);
    const e = c(NODES[3]);
    return `M ${cl.x} ${cl.y} L ${d.x} ${d.y} L ${e.x} ${e.y} Z`;
  })();

  return (
    <div aria-hidden="true" className="relative w-full">
      <svg viewBox="0 0 560 380" className="h-auto w-full max-w-[560px]">
        {/* Prompt bar */}
        <g>
          <rect x="16" y="14" width="528" height="46" rx="12" fill="white" stroke="rgba(0,0,0,0.08)" />
          <circle cx="38" cy="37" r="7" fill="#F5F3FF" stroke="#7C3AED" strokeWidth="1.5" />
          <path d="M 34.5 37 L 37 39.5 L 41.5 34.5" stroke="#7C3AED" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <text x="56" y="41" fontSize="13.5" fill="#111111" fontFamily="var(--font-geist-sans), system-ui">
            {PROMPT.slice(0, chars)}
            {typing && caret ? <tspan fill="#7C3AED">|</tspan> : null}
          </text>
        </g>

        {/* Pipes */}
        {PIPES.map((p, i) => {
          const shown = step >= p.showAt;
          const angle = (Math.atan2(p.y2 - p.y1, p.x2 - p.x1) * 180) / Math.PI;
          return (
            <g key={i} style={{ opacity: shown ? 1 : 0, transition: "opacity 0.4s ease" }}>
              <line
                x1={p.x1}
                y1={p.y1}
                x2={p.x2}
                y2={p.y2}
                stroke="#E5E5EA"
                strokeWidth="2"
                strokeDasharray="200"
                strokeDashoffset={shown ? 0 : 200}
                style={{ transition: "stroke-dashoffset 0.55s ease" }}
              />
              <polygon
                points={`${p.x2},${p.y2 - 5} ${p.x2 + 10},${p.y2} ${p.x2},${p.y2 + 5}`}
                fill="#D1D1D6"
                transform={`rotate(${angle} ${p.x2} ${p.y2})`}
              />
            </g>
          );
        })}

        {/* One violet pulse once the loop is complete */}
        {step >= TOTAL_STEPS && !reduce ? (
          <circle r="4" fill="#7C3AED">
            <animateMotion dur="4.5s" repeatCount="indefinite" path={cyclePath} />
          </circle>
        ) : null}

        {/* Node cards */}
        {NODES.map((n) => {
          const shown = step >= n.showAt;
          const cx = n.x + CARD_W / 2;
          const cy = n.y + CARD_H / 2;
          return (
            <g
              key={n.id}
              style={{
                opacity: shown ? 1 : 0,
                transform: shown ? "scale(1)" : "scale(0.9)",
                transformOrigin: `${cx}px ${cy}px`,
                transition: "opacity 0.4s ease, transform 0.4s cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              <rect x={n.x} y={n.y} width={CARD_W} height={CARD_H} rx={12} fill="white" stroke="rgba(0,0,0,0.08)" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.05))" />
              <rect x={n.x} y={n.y} width={4} height={CARD_H} rx={2} fill={n.color} />
              <text x={n.x + 16} y={n.y + 20} fontSize="12.5" fontWeight="700" fill="#111111" fontFamily="var(--font-geist-sans), system-ui">
                {n.title}
              </text>
              <text x={n.x + 16} y={n.y + 35} fontSize="10.5" fill="#8E8E93" fontFamily="var(--font-geist-sans), system-ui">
                {n.sub}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
