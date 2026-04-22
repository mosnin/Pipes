# Growth Model (Conversion & Discovery Pass)

## Public information architecture

Primary logged-out routes:
- `/`
- `/pricing`
- `/templates`
- `/templates/[slug]`
- `/use-cases`
- `/use-cases/[slug]`
- `/compare`
- `/compare/[slug]`
- `/protocol`
- `/docs`
- `/login`
- `/signup`

## Content model choices

`src/lib/public/content.ts` is the bounded public content model.
It defines:
- homepage section copy
- use case cards + workflow breakdown
- comparison page entries
- template marketing metadata derived from real template catalog

This avoids scattered string blobs and keeps product/marketing vocabulary aligned.

## Growth signal model

Bounded events are defined in `src/lib/public/metrics.ts` and accepted via `isGrowthEvent`.
Tracked entry points include:
- homepage CTA clicks
- pricing CTA clicks
- signup starts
- template detail views
- use case views
- comparison views
- protocol docs views
- public template instantiate CTA clicks
- signup entry source context

Signals are intentionally lightweight and file-backed in this pass (`.pipes-growth.json` in local runtime).
Some events remain reserved for future wiring (`signup_completed`, `first_value_route_chosen`) and are intentionally kept in the bounded taxonomy for forward compatibility.

## Template/use case discovery logic

- Template marketing metadata is derived from `starterTemplates` to prevent drift.
- Each use case references real template IDs.
- Template detail pages provide shareable route-level content and clear signup CTA path.

## SEO and metadata posture

- Key public routes now define metadata title/description.
- Template/use case/comparison detail routes generate route-specific metadata from bounded content.
- Metadata intentionally reflects actual product scope (no unsupported feature claims).

## Mock vs real behavior

- Mock mode: growth events persist locally for easy verification.
- Real mode: same bounded event names and route contract, without introducing third-party analytics dependency.

## Intentional deferrals

- No heavy CMS.
- No external analytics warehouse.
- No public live-system sharing in this pass (template detail pages are the shareable model).
