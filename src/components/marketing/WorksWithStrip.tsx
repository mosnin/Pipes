"use client";

import { useReducedMotion } from "framer-motion";

// "Works with any agent" — the honest version of a logo wall. These aren't
// customer endorsements; they're the agent runtimes that read a Pipes loop
// through one open MCP token. Text wordmarks, one ink tone, hairline divider.
// No fake company logos, no borrowed credibility. See DESIGN.md.

const AGENTS = ["Claude", "LangGraph", "AutoGen", "CrewAI", "OpenAI Agents", "Any MCP client"];

export function WorksWithStrip() {
  const reduce = useReducedMotion();
  return (
    <section
      aria-label="Works with any agent runtime"
      className="border-y border-[var(--color-line)] bg-white"
    >
      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-center t-overline text-[#8E8E93]">
          One MCP token. Read by any agent runtime.
        </p>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {AGENTS.map((name, i) => (
            <li
              key={name}
              className="t-label font-semibold tracking-tight text-[#3C3C43] transition-colors duration-200 hover:text-[#111]"
              style={
                reduce
                  ? undefined
                  : { animation: `works-fade 0.5s ${i * 60}ms both ease-out` }
              }
            >
              {name}
            </li>
          ))}
        </ul>
      </div>
      <style>{`
        @keyframes works-fade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
