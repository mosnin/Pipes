"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "@/components/ui/icon";
import { PALETTES, type Palette, Shader } from "@/components/ui/shader";
import { cn } from "@/lib/utils";

/**
 * Pipes' block tiles on a shader: square white tiles with a hard offset shadow
 * in the palette's ink, joined by square pipe segments that pulse in turn, as
 * if work were moving between them. `solid` drops the segments for start cards.
 */
export function BlockTiles({ icons, solid, small, palette = "sky" }: { icons: LucideIcon[]; solid?: boolean; small?: boolean; palette?: Palette }): ReactNode {
  const ink = PALETTES[palette][1];
  return (
    <div className="flex items-center justify-center gap-2.5">
      {icons.map((Icon, i) => (
        <div key={i} className="flex items-center gap-2.5">
          {i > 0 && !solid ? (
            <span className="flex gap-1" aria-hidden>
              {[0, 1, 2].map((d) => (
                <span key={d} className="size-1.5" style={{ background: ink, animation: `live-dot 1.2s steps(2, jump-none) ${d * 0.2}s infinite` }} />
              ))}
            </span>
          ) : null}
          <div
            className={cn("flex items-center justify-center rounded-lg bg-white/95", small ? "size-[44px]" : "size-[50px]")}
            style={{ boxShadow: `3px 3px 0 0 ${ink}, inset 0 0 0 1px rgb(0 0 0 / 0.06)`, color: ink, animation: `t-enter 500ms var(--ease-podium-out) ${120 + i * 70}ms both` }}
          >
            <Icon className={small ? "size-[21px]" : "size-6"} strokeWidth={2} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A shader band with block tiles (or anything) centred on it. */
export function ShaderBanner({ palette, icons, className, children, solid, small }: { palette: Palette; icons?: LucideIcon[]; className?: string; children?: ReactNode; solid?: boolean; small?: boolean }): ReactNode {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Shader palette={palette} className="absolute inset-0 dark:brightness-[0.9]" cell={small ? 18 : 22} />
      <div className="relative flex h-full items-center justify-center">{icons ? <BlockTiles icons={icons} solid={solid} small={small} palette={palette} /> : children}</div>
    </div>
  );
}

/** A small progress ring, for the Get started row. */
export function ProgressRing({ value, total }: { value: number; total: number }): ReactNode {
  const r = 6;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 16 16" className="size-4 -rotate-90" aria-label={`${value} of ${total} done`} role="img">
      <circle cx="8" cy="8" r={r} fill="none" stroke="color-mix(in srgb, var(--text-primary) 12%, transparent)" strokeWidth="2.25" />
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        stroke="var(--text-primary)"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.max(0.12, value / total))}
        style={{ transition: "stroke-dashoffset 500ms var(--ease-podium-out)" }}
      />
    </svg>
  );
}
