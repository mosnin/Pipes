"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Wordmark } from "@/components/Wordmark";
import { AnimatedCanvas, type CanvasEdge, type CanvasNode } from "@/components/marketing/AnimatedCanvas";

// ---------------------------------------------------------------------------
// AuthShell — shared two-column shell for signup, login, and invite-accept.
//
// Layout:
//   - Left column (60%) holds the form. Rounded-[40px] subtle surface with
//     generous padding, a wordmark, and a small contextual breadcrumb.
//   - Right column (40%) holds the product proof: a small live animated
//     canvas (the same one used on the marketing hero) and one rotating line
//     pulled from the use-case voice. Hidden below md so mobile keeps the
//     form above the fold.
// ---------------------------------------------------------------------------

export type AuthShellProps = {
  breadcrumb: "Sign in" | "Create your workspace" | "Accept invite";
  children: ReactNode;
};

// Three nodes + two pipes. Same nodes as the magic-moment hero so the right
// rail tells the same story as the homepage.
const PROOF_NODES: ReadonlyArray<CanvasNode> = [
  { id: "planner", title: "Planner", subtitle: "reads the request", x: 40, y: 60 },
  { id: "guard", title: "Plan guard", subtitle: "checks the plan", x: 260, y: 60 },
  { id: "coder", title: "Coder", subtitle: "opens the PR", x: 480, y: 60 },
];

const PROOF_EDGES: ReadonlyArray<CanvasEdge> = [
  { fromId: "planner", toId: "guard" },
  { fromId: "guard", toId: "coder" },
];

const ROTATING_LINES: ReadonlyArray<string> = [
  "Describe your system. Watch it build itself.",
  "Your team and your agents read the same graph.",
  "Stop drawing. Iterate the system in conversation.",
];

export function AuthShell({ breadcrumb, children }: AuthShellProps) {
  return (
    <main className="min-h-screen surface-subtle px-4 py-6 md:p-6">
      <div
        className="
          mx-auto grid w-full max-w-[1400px] gap-6
          md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]
          md:min-h-[calc(100vh-3rem)]
        "
      >
        <section
          className="
            relative rounded-[40px] bg-white border border-black/[0.06]
            shadow-sm-token p-8 sm:p-12 lg:p-16
            flex flex-col
          "
          aria-labelledby="auth-shell-heading"
        >
          <div className="flex items-center justify-between">
            <Wordmark size="md" />
            <span className="t-caption text-[#8E8E93]" id="auth-shell-heading">
              {breadcrumb}
            </span>
          </div>

          <div className="mt-12 sm:mt-16 flex-1 flex flex-col">
            {children}
          </div>
        </section>

        <ProofPanel />
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// ProofPanel — right rail. A small, slow animated canvas + one rotating line.
// Hidden below md so the form gets the entire viewport on mobile.
// ---------------------------------------------------------------------------

function ProofPanel() {
  const [progress, setProgress] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Drive the canvas progress in a slow continuous loop so the right rail
  // feels alive but never demands attention. 6 seconds per cycle.
  useEffect(() => {
    if (prefersReducedMotion) {
      setProgress(1);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = ((now - start) / 6000) % 1;
      // ease in/out: hold at 1 for a moment before resetting
      setProgress(t < 0.85 ? t / 0.85 : 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [prefersReducedMotion]);

  // Rotate the line every 6 seconds.
  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setInterval(() => {
      setLineIdx((i) => (i + 1) % ROTATING_LINES.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [prefersReducedMotion]);

  const line = useMemo(() => ROTATING_LINES[lineIdx] ?? ROTATING_LINES[0], [lineIdx]);

  return (
    <aside
      aria-label="Product proof"
      className="
        hidden md:flex flex-col justify-between
        rounded-[40px] p-10 lg:p-14
        bg-[#0A0A0A] text-white
        relative overflow-hidden
      "
    >
      <div className="flex items-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4F46E5]" aria-hidden="true" />
        <span className="t-overline text-white/60">Live canvas</span>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="rounded-[20px] bg-white p-4 border border-white/10 shadow-xl-token">
          <AnimatedCanvas
            nodes={PROOF_NODES}
            edges={PROOF_EDGES}
            progress={progress}
            width={640}
            height={180}
            nodeWidth={160}
            nodeHeight={60}
            nodeStart={0}
            nodeEnd={0.5}
            edgeStart={0.45}
            edgeEnd={0.9}
            ariaLabel="A planner, a guard, and a coder appearing on the canvas with pipes between them."
            className="w-full h-auto"
          />
        </div>
      </div>

      <div>
        <p
          key={lineIdx}
          className="t-h2 text-white leading-tight max-w-md transition-opacity duration-500"
          style={{
            animation: prefersReducedMotion ? "none" : "auth-line-in 480ms ease-out",
          }}
        >
          {line}
        </p>
        <p className="mt-4 t-label text-white/50">
          Built for the engineer shipping a multi-agent system this week.
        </p>
      </div>

      <style>{`
        @keyframes auth-line-in {
          0% { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </aside>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
