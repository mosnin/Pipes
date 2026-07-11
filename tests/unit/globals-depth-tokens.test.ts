import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * globals.css depth-token snapshot.
 *
 * These selectors and CSS custom properties are the contract between this
 * wave's depth pass and the rest of the design system. If any of them are
 * removed or renamed the visual depth disappears and the warm secondary
 * accent leaks to grey. Locking them down with a string-presence assertion
 * is cheaper than reaching for jsdom-computed styles, which would need a
 * full Tailwind build.
 */

const CSS_PATH = join(process.cwd(), "src/styles/globals.css");
const css = readFileSync(CSS_PATH, "utf8");

describe("globals.css depth tokens", () => {
  it("declares the warm secondary accent custom properties", () => {
    expect(css).toContain("--color-accent-warm:");
    expect(css).toContain("--color-accent-warm-light:");
    expect(css).toContain("--color-accent-warm-strong:");
    expect(css).toContain("--color-accent-warm-border:");
    // Mac-Pro amber, not a Tailwind default. Anchor on the exact hex.
    expect(css).toContain("#F59E0B");
    expect(css).toContain("#FFFBEB");
    expect(css).toContain("#D97706");
    expect(css).toContain("#FCD34D");
  });

  it("declares the five depth utilities", () => {
    expect(css).toMatch(/\.depth-radial\s*\{/);
    expect(css).toMatch(/\.depth-noise\s*\{|\.depth-noise::after\s*\{/);
    expect(css).toMatch(/\.depth-glow-indigo\s*\{/);
    expect(css).toMatch(/\.hero-vignette\s*\{/);
    // Both ::after on radial and ::before on the vignette draw the actual
    // gradient — confirm both pseudo-elements wire up.
    expect(css).toMatch(/\.depth-radial::after\s*\{/);
    expect(css).toMatch(/\.hero-vignette::before\s*\{/);
  });

  it("uses violet at low alpha for the radial bloom (no loud gradients)", () => {
    // Subtle — 0.05 alpha on the radial overlay, 0.08 on the glow.
    expect(css).toContain("rgba(124, 58, 237, 0.05)");
    expect(css).toContain("rgba(124, 58, 237, 0.08)");
  });

  it("uses SVG fractal noise at 4% opacity for depth-noise", () => {
    // The inline data URL must include the fractal noise filter.
    expect(css).toContain("feTurbulence");
    expect(css).toContain("fractalNoise");
    // The rect inside the noise SVG should be drawn at 0.04 opacity.
    expect(css).toContain("opacity='0.04'");
  });

  it("declares the three accent-warm utility classes", () => {
    expect(css).toMatch(/\.accent-warm-bg\s*\{/);
    expect(css).toMatch(/\.accent-warm-text\s*\{/);
    expect(css).toMatch(/\.accent-warm-border\s*\{/);
    // Each utility must consume one of the warm custom properties.
    expect(css).toContain("var(--color-accent-warm-light)");
    expect(css).toContain("var(--color-accent-warm-strong)");
    expect(css).toContain("var(--color-accent-warm-border)");
  });

  it("leaves existing animation tokens intact (no accidental deletion)", () => {
    // Anchor on three pre-existing names so a future rewrite of globals.css
    // can't quietly wipe them while landing depth utilities.
    expect(css).toContain("looper-node-arrival");
    expect(css).toContain("looper-edge-stream");
    expect(css).toContain("looper-node-pulsing");
  });
});
