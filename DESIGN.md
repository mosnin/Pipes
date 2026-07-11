# DESIGN.md — the Pipes design language

This document governs every visual decision in this repository. Components
serve the brand; the brand never serves a component library. When a change
conflicts with this document, the change is wrong.

## Philosophy: the canvas is the brand

Pipes is a visual systems editor. The product **is** a graph — nodes, pipes,
and pulses of work moving through them. Every marketing visual and every
in-app surface draws from that single vocabulary. We never illustrate the
product with stock metaphors (fake analytics cards, generic dashboards,
abstract blobs). If a visual isn't a loop, a node, a pipe, or the calm
surface they sit on, it doesn't ship.

Three tests for any screen:
1. **Inevitable** — could this screen be simpler? If yes, simplify it.
2. **One job** — what is the single thing this screen asks the user to do?
   If you can't answer in one sentence, the screen is wrong.
3. **Same world** — would a user recognize this screen as Pipes with the
   logo removed? If not, it's off-brand.

## Tokens (single source: src/styles/globals.css @theme)

- **Accent**: violet-600 `#7C3AED`. One accent. Used at most twice per
  screen: the primary action, and (optionally) one live signal. Everything
  else is ink and surface. If violet appears three times on a screen,
  remove one.
- **Ink scale**: `#111111` primary / `#3C3C43` secondary / `#8E8E93` muted /
  `#C7C7CC` disabled. Text is never pure black-on-violet or gray-on-gray
  below AA.
- **Surfaces**: white cards on `#F5F3FF`-tinted canvas (light);
  `#131316` cards on `#0A0A0C` (dark). No intermediate grays invented ad hoc.
- **Borders**: hairlines only — `rgba(0,0,0,0.08)` light, `rgba(255,255,255,0.10)`
  dark. Borders separate; they never decorate.
- **Radius**: input 8 / card 12 / modal 16. Nothing else.
- **Type**: Geist Sans for UI, Inter Tight ≥700 for display headlines,
  Geist Mono for tokens/code. Hierarchy comes from size + weight + ink,
  never from color variety.
- **Motion**: 120/200/400ms, ease-out-expo. Motion carries meaning — a
  pulse traveling a pipe means "work is flowing". Decorative motion is
  deleted on sight. Every animation respects `prefers-reduced-motion`.

## Vendor components (src/components/fx, pixel-perfect, templates, charts)

These are raw material, not design. Rules:
- A vendor component ships only after it is **re-voiced**: our tokens, our
  radii, our borders, our motion timing. Default shadcn fingerprints
  (slate palettes, ring-offset glows, 6px radii) are removed.
- One new visual idea per screen, maximum. A screen that gains a circuit
  board does not also gain shimmer text, a dot grid, and a carousel.
- Anything unused after integration gets deleted, not kept "just in case".

## Voice

Short declarative sentences. No exclamation marks. The product speaks like
someone who knows it works: "Describe the loop. Watch it appear." Buttons
are verbs ("Start free", "Open the canvas"), never nouns or "Learn more".
