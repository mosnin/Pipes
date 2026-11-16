"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "@/components/ui/icon";
import { type Palette, Shader } from "@/components/ui/shader";
import { cn } from "@/lib/utils";

const SOLID_TINTS = ["#229ed9", "#0a66c2", "#1fa463"];

/** Podium's frosted icons linked by dots, floating on a shader. `solid` swaps the glass for white tiles. */
export function GlassIcons({ icons, solid, small }: { icons: LucideIcon[]; solid?: boolean; small?: boolean }): ReactNode {
  return (
    <div className="flex items-center justify-center gap-2.5">
      {icons.map((Icon, i) => (
        <div key={i} className="flex items-center gap-2.5">
          {i > 0 && !solid ? (
            <span className="flex gap-1.5" aria-hidden>
              {[0, 1, 2].map((d) => (
                <span key={d} className="size-1.5 rounded-full border border-white/80" style={{ animation: `live-dot 1.6s ease-in-out ${d * 0.2}s infinite` }} />
              ))}
            </span>
          ) : null}
          {solid ? (
            <div
              className={cn("flex items-center justify-center bg-white/95 shadow-[0_6px_16px_-6px_rgb(20_20_60/0.3),0_0_0_0.5px_rgb(0_0_0/0.06)]", small ? "size-[46px] rounded-[14px]" : "size-14 rounded-[14px]")}
              style={{ animation: `t-enter 500ms var(--ease-podium-out) ${120 + i * 70}ms both`, color: SOLID_TINTS[i % SOLID_TINTS.length] }}
            >
              <Icon className={small ? "size-[22px]" : "size-6"} strokeWidth={2.1} />
            </div>
          ) : (
            <div
              className={cn("glass flex items-center justify-center text-white", small ? "size-[46px] rounded-[14px]" : "size-[52px] rounded-[14px]")}
              style={{ animation: `t-enter 500ms var(--ease-podium-out) ${120 + i * 70}ms both` }}
            >
              <Icon className="size-6 drop-shadow-[0_1px_2px_rgb(20_20_60/0.25)]" strokeWidth={2.2} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** A shader band with glass icons (or anything) centred on it. */
export function ShaderBanner({ palette, icons, className, children, solid, small }: { palette: Palette; icons?: LucideIcon[]; className?: string; children?: ReactNode; solid?: boolean; small?: boolean }): ReactNode {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Shader palette={palette} className="absolute inset-0 dark:brightness-[0.9]" />
      <div className="relative flex h-full items-center justify-center">{icons ? <GlassIcons icons={icons} solid={solid} small={small} /> : children}</div>
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
