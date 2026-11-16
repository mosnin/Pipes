# Pipes

Pipes is where teams design, store and version the workflows and loops their
agents follow. Next.js 16 (App Router) + Convex, with a mock mode
(`PIPES_USE_MOCKS=true`) for local work.

## Design rules are blocking

Pipes uses the Podium design system wholesale: the same tokens, type, corners,
primitives, chassis and motion as the Podium app. Before writing or changing
any UI, page, component or piece of user-facing copy:

1. [docs/DESIGN.md](docs/DESIGN.md) is the visual contract. `src/app/globals.css`
   implements it; use its tokens (`bg-card`, `bg-muted`, `text-muted-foreground`,
   `bg-floor/12`, or the older names aliased onto the same values) and type
   roles (`t-body`, `t-mono-hash`...), never a hard-coded hex. Corners are 8px,
   14px, 20px or full. Spacing is Tailwind's default scale.
2. Read [anti-slop.md](anti-slop.md). Its rules are blocking: no italics, no em
   dashes in copy, no decorative icons, no border-accent bars, sentence case,
   human copy. Its "Argued exceptions" section lists where Podium's shader
   light, glass icons and grain are allowed (named art surfaces only), lucide
   as the icon set, and the phone navigation drawer.
3. Reuse the primitive, don't restyle by hand. Build from
   `src/components/ui/*`, `src/components/data/*`,
   `src/components/layouts/archetypes.tsx` and `src/components/shell/*`, each
   imported from its own file. If a primitive can't do what you need, extend it
   so every use gets the change. Icons only from `@/components/ui/icon`.
4. Render the surface at 375px and 1440px in light and dark and look at it.
   "It looks fine in the code" is not a check.

When Podium's design system changes, port the change here rather than letting
the two drift.
