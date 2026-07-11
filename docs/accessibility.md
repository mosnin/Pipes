# Accessibility

## Standard

We target **WCAG 2.1 Level AA**. Every public marketing route and every UI
primitive must be free of `serious` and `critical` axe-core violations against
the `wcag2a`, `wcag2aa`, `wcag21a`, and `wcag21aa` tag sets.

## What's tested in CI

- **Playwright** (`tests/e2e/accessibility.spec.ts`) — visits every public
  route (`/`, `/pricing`, `/docs`, `/protocol`, `/templates`, `/use-cases`,
  `/compare`, `/login`, `/signup`), runs `AxeBuilder({ page }).analyze()`, and
  fails the build on any `serious` or `critical` violation. This is the
  authoritative gate. Run with `npx playwright test tests/e2e/accessibility.spec.ts`.
- **Vitest** (`tests/unit/accessibility-primitives.test.tsx`) — renders each UI
  primitive (`Button`, `Input`, `Textarea`, `Dialog`, `Tooltip`, `MetricCard`,
  `DataTable`, `EmptyState`, `SegmentedControl`, `SearchInput`, `StatusBadge`,
  `Breadcrumbs`) under jsdom and runs `axe.run()` against it. Color-contrast is
  disabled at this layer because jsdom has no layout engine.

## Known limitations

- No formal screen-reader QA report (NVDA / VoiceOver journey audits are not
  scripted).
- Mobile a11y (TalkBack / VoiceOver iOS) is not separately tested.
- The editor canvas (`/systems/[id]`) is mouse-first for advanced node
  manipulation — keyboard equivalents exist for selection and pan, but not for
  every drag gesture.
- Tremor chart internals on `/admin/metrics` rely on Tremor's own a11y
  attributes; we do not modify them.

## Keyboard map

All global shortcuts are registered through `src/lib/keyboard/registry.ts`. The
in-app overlay (press `?`) lists every registered binding. Highlights:

- `Cmd/Ctrl + K` — command palette
- `?` — keyboard shortcuts overlay
- `Esc` — close dialogs, palettes, overlays

## Color contrast policy

Our text palette ranks ink shades from darkest to lightest:

- `#111` (ink-1) — primary text.
- `#3C3C43` (ink-2) — secondary text. Required for any body text under 14px on
  a white background.
- `#8E8E93` (ink-3) — placeholders and decorative captions ONLY. Do not use
  for primary or secondary text smaller than 14px.

Status pill tones (success / warning / danger / info) ship with bordered light
backgrounds whose foreground colors clear 4.5:1 against their fill.

## Adding a new component a11y-correctly

1. Use semantic HTML first (`<button>`, `<a>`, `<label>`, `<nav>`, `<main>`)
   before reaching for ARIA.
2. Every interactive element must be reachable via Tab and operable via Enter
   or Space; icon-only buttons must carry an `aria-label`, and the icon itself
   should be `aria-hidden="true"`.
3. Form fields need an associated `<label>` (or `aria-labelledby`).
4. Heading order must not skip a level. Promote / demote heading levels rather
   than restyling.
5. Add the new primitive to `tests/unit/accessibility-primitives.test.tsx` so it
   is covered by the CI gate.
