# Pipes

Pipes is where teams design, store and version the workflows and loops their
agents follow. Next.js 16 (App Router) + Convex, with a mock mode
(`PIPES_USE_MOCKS=true`) for local work.

## Design rules are blocking

Pipes uses the Company OS design language wholesale: same tokens, type,
primitives and chassis. Before writing or changing any UI, page, component or
piece of user-facing copy:

1. Read [anti-slop.md](anti-slop.md). All twenty-one rules are mandatory and
   blocking. No italics, no em dashes in copy, no decorative icons, no
   border-accent bars, no side drawers, sentence case, human copy.
2. [docs/DESIGN_LANGUAGE.md](docs/DESIGN_LANGUAGE.md) is the visual contract
   and [docs/SHOPIFY_MEASUREMENTS.md](docs/SHOPIFY_MEASUREMENTS.md) the
   measured geometry. `src/app/globals.css` implements both; use its tokens
   and type roles (`bg-raised`, `text-ink-2`, `t-body`, `t-mono-hash`...),
   never a hard-coded hex.
3. Build from the primitives in `src/components/ui/*`, `src/components/data/*`,
   `src/components/layouts/archetypes.tsx` and `src/components/shell/*`.
   Import each from its own file. Icons only from `@/components/ui/icon`.
4. Render the surface at 375px and 1440px in light and dark and look at it.
   "It looks fine in the code" is not a check.

When the Company OS design system changes, port the change here rather than
letting the two drift.
