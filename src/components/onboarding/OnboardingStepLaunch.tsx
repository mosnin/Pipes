"use client";

import { useEffect, useMemo, useState } from "react";
import { OnboardingStepShell, type OnboardingStep } from "./OnboardingStepShell";
import { AnimatedCanvas, type CanvasEdge, type CanvasNode } from "@/components/marketing/AnimatedCanvas";
import { starterTemplates } from "@/domain/templates/catalog";

// Step 4 — building your first system.
// Visually shows the agent assembling the starter graph: three nodes
// scale-in over ~280ms each, edges draw in over ~200ms each. After the hold
// we POST to /api/systems and route to the editor with the starter prompt
// so the agent re-fires for real on real persistence.

export type OnboardingStepLaunchProps = {
  step: OnboardingStep;
  starterId: string | null;
  workspaceName: string;
  direction?: 1 | -1;
  onJumpTo?: (step: OnboardingStep) => void;
  onComplete: (systemId: string, prompt: string) => void;
  onError?: (message: string) => void;
};

type Phase = "animating" | "creating" | "ready" | "error";

export function OnboardingStepLaunch({
  step,
  starterId,
  workspaceName,
  direction,
  onJumpTo,
  onComplete,
  onError,
}: OnboardingStepLaunchProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const { nodes, edges, prompt, title } = useMemo(
    () => pickLaunchGraph(starterId),
    [starterId],
  );

  const [progress, setProgress] = useState(prefersReducedMotion ? 1 : 0);
  const [phase, setPhase] = useState<Phase>("animating");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Drive a one-shot canvas animation: ~1.4s for nodes+edges, then ~0.6s hold.
  useEffect(() => {
    if (prefersReducedMotion) {
      setProgress(1);
      setPhase("creating");
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 2000;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setProgress(t);
      if (t >= 1) {
        setPhase("creating");
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [prefersReducedMotion]);

  // Once animation finishes, create the system via the real API and route.
  useEffect(() => {
    if (phase !== "creating") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/systems", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: workspaceName.trim().length > 0
              ? `${workspaceName.trim()} — ${title}`
              : title,
            description: prompt,
          }),
        });
        if (!res.ok) {
          throw new Error(`Could not create the system (status ${res.status}).`);
        }
        const data: { ok: boolean; data?: { systemId?: string }; error?: string } =
          await res.json();
        if (!data.ok || data.data?.systemId == null) {
          throw new Error(data.error ?? "Could not create the system.");
        }
        if (cancelled) return;
        setPhase("ready");
        onComplete(data.data.systemId, prompt);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Something went wrong.";
        setPhase("error");
        setErrorMsg(message);
        onError?.(message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, prompt, title, workspaceName, onComplete, onError]);

  const headline = phase === "error"
    ? "We could not finish building it."
    : "Building your first system...";
  const sub = phase === "error"
    ? "Something interrupted the build. Try again in a moment."
    : "This takes about three seconds.";

  return (
    <OnboardingStepShell
      step={step}
      direction={direction}
      title={headline}
      subtitle={sub}
      onJumpTo={onJumpTo}
      hideControls
    >
      <div className="rounded-3xl border border-black/[0.06] bg-white p-4 sm:p-6 shadow-sm-token">
        <AnimatedCanvas
          nodes={nodes}
          edges={edges}
          progress={progress}
          width={960}
          height={280}
          nodeWidth={180}
          nodeHeight={64}
          nodeStart={0}
          nodeEnd={0.6}
          edgeStart={0.45}
          edgeEnd={0.95}
          ariaLabel={`Looper canvas building ${title}.`}
          className="w-full h-auto"
        />
      </div>

      <div className="mt-6 flex items-center justify-center gap-3 t-label text-[#3C3C43]">
        <span
          aria-hidden="true"
          className={[
            "inline-block w-2 h-2 rounded-full",
            phase === "error"
              ? "bg-[#DC2626]"
              : phase === "ready"
                ? "bg-[#059669]"
                : "bg-indigo-600 animate-pulse",
          ].join(" ")}
        />
        <span>
          {phase === "animating" && "Drawing the nodes."}
          {phase === "creating" && "Saving to your workspace."}
          {phase === "ready" && "Opening the canvas."}
          {phase === "error" && (errorMsg ?? "Build interrupted.")}
        </span>
      </div>
    </OnboardingStepShell>
  );
}

// ---------------------------------------------------------------------------

type LaunchGraph = {
  title: string;
  prompt: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
};

// Pick three nodes + two edges from the catalog so the launch animation
// previews exactly what the editor will show next.
export function pickLaunchGraph(starterId: string | null): LaunchGraph {
  const t = starterId != null
    ? starterTemplates.find((s) => s.id === starterId)
    : null;
  if (t == null) {
    return {
      title: "Multi-agent Handoff",
      prompt:
        "Planner agent reads tickets, writes a plan, hands off to a coder agent that opens a PR.",
      nodes: [
        { id: "planner", title: "Planner", subtitle: "reads the request", x: 40, y: 80 },
        { id: "guard", title: "Plan guard", subtitle: "checks the plan", x: 360, y: 80 },
        { id: "coder", title: "Coder", subtitle: "opens the PR", x: 680, y: 80 },
      ],
      edges: [
        { fromId: "planner", toId: "guard" },
        { fromId: "guard", toId: "coder" },
      ],
    };
  }

  // Take three nodes spread across the original layout and the two edges
  // that connect them. Falls back gracefully on shorter templates.
  const ordered = [...t.nodes];
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const middle = ordered[Math.floor(ordered.length / 2)];
  const picks = first != null && middle != null && last != null
    ? [first, middle, last]
    : ordered.slice(0, 3);

  const nodes: CanvasNode[] = picks.map((n, i) => ({
    id: n.id,
    title: n.title,
    subtitle: oneLine(n.description ?? ""),
    x: 40 + i * 320,
    y: 80,
  }));

  const edges: CanvasEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const a = nodes[i];
    const b = nodes[i + 1];
    if (a != null && b != null) {
      edges.push({ fromId: a.id, toId: b.id });
    }
  }

  return {
    title: t.title,
    prompt: t.useCase,
    nodes,
    edges,
  };
}

function oneLine(text: string): string {
  const stripped = text.replace(/\{\{[^}]+\}\}/g, "").trim();
  if (stripped.length <= 48) return stripped;
  return stripped.slice(0, 45).trimEnd() + "...";
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
