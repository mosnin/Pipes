"use client";

/**
 * glimm, as Podium uses it: a band of colour sweeps across the screen, and
 * only on rare moments that change the scene (docs/DESIGN.md, Glimm). In Pipes
 * that is finishing Get started and opening a workflow you just created.
 * Reduced motion and missing WebGL fall back to a plain navigation; glimm
 * handles both itself.
 */
import { accentChain } from "glimm";
import { GlimmProvider, useGlimm } from "glimm/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, type ReactNode } from "react";

/** Podium's brand chain: blue, violet, peach, the same hues as the shaders. */
const PALETTE = accentChain(["#3d8bff", "#8f7cff", "#ffb8a1"]);

export function SweepProvider({ children }: { children: ReactNode }): ReactNode {
  const { resolvedTheme } = useTheme();
  return (
    <GlimmProvider palette={PALETTE} brightness={resolvedTheme === "dark" ? 0.85 : 1}>
      {children}
    </GlimmProvider>
  );
}

/** Navigate with the sweep. For scene changes only, never ordinary links. */
export function useSweepTo(): (path: string) => void {
  const { sweep } = useGlimm();
  const router = useRouter();
  return useCallback((path: string) => void sweep(() => router.push(path), { sweepMs: 900 }), [sweep, router]);
}

/** Play the sweep over the current screen, for a moment that doesn't navigate. */
export function useSweep(): () => void {
  const { sweep } = useGlimm();
  return useCallback(() => void sweep(() => undefined, { sweepMs: 900 }), [sweep]);
}
