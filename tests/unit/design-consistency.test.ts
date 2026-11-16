/**
 * Guard: one design system (Podium's, see docs/DESIGN.md), applied the same way
 * everywhere, in both themes. Ported from Podium's consistency guard.
 *
 * Fails `npm test` when code drifts:
 * 1. A neutral surface is painted hard white, black or a hex colour, which
 *    breaks dark mode. Raw colours belong only on the art files listed below.
 * 2. A corner radius outside the system: 8px, 14px, 20px or full (plus 6px for
 *    the segmented pill, 4px for tiny inline marks and 26px for the intro card). The older token names
 *    resolve onto the same four sizes in globals.css.
 *
 * If a rule must change, change it in docs/DESIGN.md and here in the same commit.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const src = join(process.cwd(), "src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return name.endsWith(".tsx") ? [p] : [];
  });
}

/** Decorative art drawn on shaders or as illustrations, where literal colours are the point. */
const ART = new Set(["components/ui/empty-art.tsx", "components/ui/shader.tsx", "components/ui/shader-banner.tsx", "components/ui/glyph-card.tsx", "components/ui/stickers.tsx", "components/marketing/auth-art.tsx", "components/shell/intro.tsx"]);
const RADII = new Set([
  "rounded-lg", "rounded-8", "rounded-6", "rounded-[6px]", "rounded-4", "rounded-[4px]", "rounded-2", "rounded-sm",
  "rounded-[14px]", "rounded-10", "rounded-12", "rounded-14", "rounded-xl",
  "rounded-[20px]", "rounded-16", "rounded-20", "rounded-[22px]",
  "rounded-[26px]", // the intro card, as in Podium
  "rounded-full", "rounded-[inherit]", "rounded-none", "rounded-0",
]);

const all = files(src).map((f) => ({ rel: relative(src, f), lines: readFileSync(f, "utf8").split("\n") }));

describe("design consistency", () => {
  it("never paints a neutral surface hard white, black or hex", () => {
    const offenders: string[] = [];
    for (const { rel, lines } of all) {
      if (ART.has(rel)) continue;
      lines.forEach((line, i) => {
        // Opaque only: scrims (bg-black/40) are fine.
        if (/\bbg-(white|black)(?![/\w-])|\bbg-\[#[0-9a-fA-F]{3,8}\]/.test(line)) offenders.push(`${rel}:${i + 1}: ${line.trim().slice(0, 100)}`);
      });
    }
    expect(offenders, "Use tokens (bg-card, bg-muted, bg-subtle...) so dark mode follows").toEqual([]);
  });

  it("uses only the system's corner radii", () => {
    const offenders: string[] = [];
    for (const { rel, lines } of all) {
      if (ART.has(rel)) continue;
      lines.forEach((line, i) => {
        for (const m of line.matchAll(/(?<![\w-])rounded(?:-(?:\[[^\]\s]+\]|[a-z0-9]+))?(?=[\s"'`]|$)/g)) {
          const cls = m[0];
          if (cls === "rounded") continue; // the bare word in comments and prose
          if (!RADII.has(cls)) offenders.push(`${rel}:${i + 1}: ${cls}`);
        }
      });
    }
    expect(offenders, "Corners: 8px, 14px, 20px or full (see docs/DESIGN.md)").toEqual([]);
  });
});
