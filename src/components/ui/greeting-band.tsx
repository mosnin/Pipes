"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { type Palette, Shader } from "@/components/ui/shader";
import { Sticker } from "@/components/ui/stickers";
import type { LucideIcon } from "@/components/ui/icon";
import { BlockTiles, ShaderBanner } from "@/components/ui/shader-banner";

const subscribeNothing = (): (() => void) => () => {};

/** The light outside, roughly: the palette and greeting for the viewer's hour. */
export function greetingFor(hour: number): { text: string; palette: Palette } {
  if (hour < 5) return { text: "Working late", palette: "ember" };
  if (hour < 12) return { text: "Good morning", palette: "sunrise" };
  if (hour < 18) return { text: "Good afternoon", palette: "sky" };
  return { text: "Good evening", palette: "dusk" };
}

/**
 * Podium's greeting band: a shader in the time of day's palette, the mascot
 * for the hour, and black text on a white scrim so it reads on every palette
 * in both themes. The hour is the viewer's, so the band settles after mount.
 */
export function GreetingBand({ name, children }: { name?: string; children?: ReactNode }): ReactNode {
  const hour = useSyncExternalStore(subscribeNothing, () => new Date().getHours(), () => -1);
  const known = hour >= 0;
  const g = known ? greetingFor(hour) : { text: "Welcome back", palette: "sky" as Palette };
  return (
    <div className="relative mb-10 overflow-hidden rounded-[20px] border border-border">
      <Shader key={g.palette} palette={g.palette} className="absolute inset-0 dark:brightness-[0.92]" seed={new Date().getDate()} speed={0.7} />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/20 to-transparent dark:from-white/40 dark:via-white/10" />
      {known ? <Sticker kind={hour < 12 || hour >= 18 ? "star-burst" : "sparkle-trio"} size={84} tilt={8} className="absolute bottom-5 right-8 max-sm:hidden" /> : null}
      <div className="relative px-6 pb-6 pt-14 sm:px-7 sm:pr-40 sm:pt-20">
        <h1 className="text-[26px] font-medium tracking-[-0.022em] text-black/90">
          {g.text}
          {name ? `, ${name}` : ""}
        </h1>
        {children ? <p className="mt-1 max-w-[52ch] text-[15px] text-black/70">{children}</p> : null}
      </div>
    </div>
  );
}

/** Podium's start card: a small shader banner with white icon tiles, a title and a line. */
export function StartCard({ palette, icons, title, body, onClick, hint }: { palette: Palette; icons: LucideIcon[]; title: string; body: string; onClick: () => void; hint?: string }): ReactNode {
  return (
    <button type="button" onClick={onClick} className="press group rounded-[20px] border border-border bg-card p-1 text-left transition-shadow hover:shadow-float active:scale-[0.99]">
      <ShaderBanner palette={palette} icons={icons} solid small className="aspect-[2.2] rounded-[14px]" />
      <div className="px-3 pb-3 pt-3">
        <div className="flex items-center gap-2 text-[15px] font-medium tracking-[-0.01em]">
          {title}
          {hint ? <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{hint}</span> : null}
        </div>
        <div className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{body}</div>
      </div>
    </button>
  );
}

/**
 * A page-opening band in a fixed palette, with block tiles on the right. For
 * the few pages Podium opens on light: agent pages and conversation openings.
 * It carries the page's h1.
 */
export function BandHeader({ palette, title, icons, children }: { palette: Palette; title: string; icons?: LucideIcon[]; children?: ReactNode }): ReactNode {
  return (
    <div className="relative overflow-hidden rounded-[20px] border border-border">
      <Shader palette={palette} className="absolute inset-0 dark:brightness-[0.92]" speed={0.6} />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/20 to-transparent dark:from-white/40 dark:via-white/10" />
      {icons ? (
        <div className="absolute inset-y-0 right-8 hidden items-center lg:flex">
          <BlockTiles icons={icons} palette={palette} />
        </div>
      ) : null}
      <div className="relative px-6 pb-6 pt-14 sm:px-7 sm:pt-20 lg:pr-[300px]">
        <h1 className="text-[26px] font-medium leading-[1.15] tracking-[-0.022em] text-black/90">{title}</h1>
        {children ? <p className="mt-1.5 max-w-[56ch] text-[15px] leading-relaxed text-black/70">{children}</p> : null}
      </div>
    </div>
  );
}
