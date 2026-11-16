"use client";

/**
 * The glyph banner: one of Podium's gradient shader bands (shader.tsx), with
 * a living field of characters drifting over it (the vendored
 * `<glyph-card-black>` WebGL element, card colour off, white glyphs). The
 * pointer opens a hole in the field as it passes.
 *
 * Shaders in Podium are gradients; this keeps the glyph field on one, so it
 * reads like the Home greeting and the other bands rather than a black card.
 * The element's own sentence and labels scale with its width, so they're off;
 * Podium sets the heading itself, at the page's sizes.
 *
 * The element is ~110 KB with its fonts, so it loads only where a banner is
 * shown. Rare moments only (DESIGN.md): today, the Integrations header.
 */
import { type ReactNode, useEffect, useState } from "react";
import { type Palette, Shader } from "@/components/ui/shader";
import { cn as cx } from "@/lib/utils";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "glyph-card-black": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { [attr: string]: unknown };
    }
  }
}

const TINT: Partial<Record<Palette, string>> = { sky: "#24308f", sunrise: "#7a3d12", bloom: "#7a1f55", lagoon: "#0e4f57", dusk: "#3b1f7a", ember: "#6e1d12" };

let loading: Promise<unknown> | null = null;
const load = () => (loading ??= import("@/vendor/glyph-card/glyph-card-black.js"));

export function GlyphBanner({ palette = "sky", title, children, word = "PODIUM", seed = 7, className }: { palette?: Palette; title: ReactNode; children?: ReactNode; word?: string; seed?: number; className?: string }) {
  const [ready, setReady] = useState(false);
  // The glyphs take a deep shade of the band's own colour, so the field reads as texture in the gradient, not as a second colour.
  const tint = TINT[palette] ?? "#1c2f57";
  const reduced = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    let alive = true;
    void load().then(() => alive && setReady(true), () => {});
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div className={cx("relative overflow-hidden rounded-[20px] border border-border", className)}>
      <Shader palette={palette} className="absolute inset-0 dark:brightness-[0.92]" seed={seed} speed={0.6} />
      {ready && (
        <glyph-card-black
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.34] dark:opacity-[0.38]"
          style={{ display: "block", position: "absolute", inset: 0, width: "100%", height: "100%" }}
          sentence=""
          label1=""
          label2=""
          word={word}
          seed={seed}
          appearance="light"
          background="false"
          mark="false"
          hand="true"
          radius={0}
          density={64}
          speed={reduced ? 0.2 : 0.7}
          fps={reduced ? 6 : 24}
          ink={tint}
          mid={tint}
          dim={tint}
          accent={tint}
          text={tint}
        />
      )}
      {/* Same soft scrim as the Home greeting, so the heading reads on every palette in both themes. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/70 via-white/35 to-transparent dark:from-white/45 dark:via-white/15" />
      <div className="pointer-events-none relative px-6 pb-6 pt-14 sm:px-7 sm:pt-20">
        <h2 className="text-[26px] font-medium leading-[1.15] tracking-[-0.022em] text-black/90">{title}</h2>
        {children && <p className="mt-1.5 max-w-[56ch] text-[15px] leading-relaxed text-black/70">{children}</p>}
      </div>
    </div>
  );
}
