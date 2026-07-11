"use client";

import { useState } from "react";
import { GitBranch, Sparkles } from "lucide-react";
import { BuildClient } from "@/components/build/BuildClient";
import { CompilerClient } from "@/components/compile/CompilerClient";

export type BuildMode = "describe" | "compile";

// One door for turning intent into a loop. Two inputs — describe a goal, or
// compile an existing document — behind a single segmented control, so there
// is exactly one place in the product to build. (Jobs: one job per screen.)
const MODES: { id: BuildMode; label: string; hint: string; icon: typeof GitBranch }[] = [
  { id: "describe", label: "Describe a goal", hint: "Plain language in. A planned loop out.", icon: GitBranch },
  { id: "compile", label: "Compile a document", hint: "Paste an SOP, spec, or doc. Extract the loop.", icon: Sparkles },
];

export function BuildStudio({ initialMode = "describe" }: { initialMode?: BuildMode }) {
  const [mode, setMode] = useState<BuildMode>(initialMode);
  const active = MODES.find((m) => m.id === mode) ?? MODES[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Segmented control */}
      <div
        role="tablist"
        aria-label="How to build your loop"
        className="inline-flex self-start rounded-[10px] border border-line surface-canvas p-1 shadow-xs"
      >
        {MODES.map((m) => {
          const selected = m.id === mode;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={selected}
              onClick={() => setMode(m.id)}
              className={[
                "inline-flex items-center gap-2 rounded-[7px] px-3.5 h-9 t-label font-medium transition-colors duration-150",
                selected
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-ink-2 hover:text-ink-1 hover:bg-hover",
              ].join(" ")}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {m.label}
            </button>
          );
        })}
      </div>

      <p className="t-caption text-ink-3 -mt-3">{active.hint}</p>

      {mode === "describe" ? <BuildClient /> : <CompilerClient />}
    </div>
  );
}
