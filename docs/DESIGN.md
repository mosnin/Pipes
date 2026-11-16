# DESIGN.md

How Pipes looks, moves and feels. Pipes uses the **Podium design system**:
the same tokens, type, corners, primitives, chassis and motion as the Podium
app (`mosnin/podium`, `apps/web`). When Podium's system changes, port the change
here rather than letting the two drift.

The code is the source of truth. Tokens live in `src/app/globals.css`,
primitives in `src/components/ui/*`, `src/components/data/*` and
`src/components/ledger/status.tsx`, and the chassis in `src/components/shell/*`.
If this file and the code disagree, fix one of them in the same change.

## The idea

A quiet, well-lit room: near-monochrome, precise, calm. Colour shows up only
where something is alive or needs you:

- a run is live or succeeded (green, `floor`)
- something needs a person: an approval, a caution (orange, `queued`)
- something failed or is destructive (red, `destructive`)
- agent origin (violet, `agent`), sparingly
- links, focus and selection (the one blue, `accent`)
- empty states (sky blue isometric figures, `sky`), and nothing else

Chrome, text, controls and people stay neutral.

## Chassis

| Trait | How Pipes does it |
|---|---|
| Panels float on a canvas | Sidebar and main view are two 14px-radius panels with a hairline border on a `#f5f5f5` canvas (`#1c1c1c` dark), 6px apart. They go edge to edge on phones. |
| Quiet sidebar | 256px wide. 30px rows on a 32px pitch, 13px medium text, 15px icons at a 1.7 stroke with a 9px gap, `muted` fill when current. Section labels are 13px regular, sentence case. Titled sections carry the hook rail. |
| Workspace switcher | Gradient logo square, name, `ChevronsUpDown`; search and collapse on the right. The menu holds the account, the workspace and its plan, invite, billing and sign out. |
| Collapsed rail | 56px of icons. The workflow editor always opens on the rail, for canvas room. The choice is saved as `pipes.sidebar`. |
| Phones | The sidebar becomes a drawer behind a menu button in the page bar; it closes on navigation. |
| Slim page bar | 50px bar with a 16px section icon and the breadcrumb as a 15px title. |
| Page intro | The body opens with a 26px medium title and one 15px muted sentence (`PageHeader`). |
| Measures | 40px above the body on desktop. `PageShell measure="page"` is `max-w-5xl`, `prose` is `max-w-3xl`. |

`src/components/shell/app-shell.tsx` builds the chassis,
`nav-sidebar.tsx` the sidebar and rail, `topbar.tsx` the page bar and
`nav-config.ts` the one map of the product shared by the sidebar, the
breadcrumb and the ⌘K palette.

## Colour

Tokens are plain colours on `:root` and `:root.dark` in `globals.css`. Podium's
names are aliased onto them in `@theme`, so Podium code ports as written:

| Podium name | Pipes token | Light | Dark |
|---|---|---|---|
| `canvas` | `--surface-canvas` | `#f5f5f5` | `#1c1c1c` |
| `background`, `card`, `sidebar` | `--surface-raised`, `--surface-rail` | white | `#242424` |
| `subtle` | `--surface-inset` | `#fafafa` | `#292929` |
| `muted` | `--surface-selected` | `#ededed` | `#292929` |
| `border` / `border-strong` | `--line-border` / `--line-strong` | `#ececec` / `#d6d6d6` | `#2f2f2f` / `#424242` |
| `foreground` | `--text-primary` | `#0f0f0f` | `#f0f0f0` |
| `muted-foreground` | `--text-secondary` | `#666666` | `#b0b0b0` |
| `faint` | `--text-quaternary` | `#757575` | `#949494` |
| `primary` | `--action-fill` | `#171717` | `#f5f5f5` |
| `accent` | `--accent` | `#0080ff` | `#1f8fff` |
| `floor` | `--positive-mark` | `#25a750` | `#33cc66` |
| `queued` | `--caution-mark` | `#ff8000` | `#ff8f1f` |
| `destructive` | `--critical-mark` | `#e03a3f` | `#f0525a` |
| `agent` | `--agent-mark` | `#7a5ce6` | `#a58cf9` |
| `sky` | `--sky` | `#2fb4f5` | `#4cc3f7` |

Rules:

- One accent. No second brand colour in the app.
- Tinted fills are 10 to 12% (`bg-floor/12`, the `*-wash` tokens) with
  full-strength text, so they pass contrast in both themes.
- Never hard-code `bg-white`, `bg-black` or a hex on chrome, cards, tiles or
  text. Raw colours belong only on gradient art and scrims.
- Never colour text to show state when a dot, icon or label can do it.

## Type

- **Inter** (variable, optical sizes) for the interface, served from our own
  origin by `@fontsource-variable/inter`. **Geist Mono** for identifiers: node
  ids, run ids, versions, tokens, URLs.
- Base 14px / 1.45. Headings get `-0.012em` tracking and `text-wrap: balance`;
  paragraphs `text-wrap: pretty`.
- Headings are medium, never bold.

The `t-*` roles in `globals.css` carry Podium's scale:

| Role | Size / weight |
|---|---|
| `t-display` | 28 / 600 |
| `t-title-1` (page intro) | 26 / 500 |
| `t-title-2` (dialog) | 17 / 500 |
| `t-title-3`, `t-title-4` (section, card) | 15 / 500 |
| `t-body`, `t-body-medium`, `t-body-strong` | 14 / 400, 500, 500 |
| `t-caption`, `t-label-caps`, `t-group-label` | 13 / 400 |
| `t-micro` | 12 / 500 |

Use `tabular` for anything that counts or updates.

## Corners, space, elevation

- Four corner sizes: **8px** (rows, small controls, icon tiles, menu items),
  **14px** (cards, list groups, panels, menus, inputs), **20px** (dialogs and
  large surfaces), **full** (buttons, badges, avatars, dots). The `rounded-6`
  token resolves to 8, `rounded-10` and `rounded-12` to 14, `rounded-16` to 20.
- Spacing is Tailwind's default 4px scale, the same as Podium's.
- Elevation is shadow, not borders, for floating things: `shadow-pill`
  (segmented pill), `shadow-float` (menus, popovers, toasts), `shadow-modal`
  (dialogs). Cards in the flow have a hairline and no shadow.

## Components

- **Button** (`ui/button.tsx`): pills. `primary` black (white in dark),
  `secondary` white with a hairline (muted in dark), `ghost`, `destructive`
  (red label; a confirmation dialog opts into the solid fill with
  `data-solid`), `link`. Sizes xs 28, sm 32, md 36, lg 44. Every button has
  the `press` class: `scale(0.97)` on press.
- **IconButton**: 28px rounded-lg in dense rows, 32 and 36px round elsewhere.
- **Input, Textarea, Select** (`ui/input.tsx`, `ui/select.tsx`): 36px, 14px
  corners, hairline, `border-strong` on hover, accent border with a 4px accent
  halo on focus.
- **Segmented** (`ui/segmented.tsx`): 26px `muted` track, sliding pill 6px
  inside an 8px track, 12 to 13px medium labels.
- **Card** (`ui/card.tsx`): white, hairline, 14px corners. Lists are rows inside
  one card, divided by hairlines.
- **Dialog** (`ui/dialog.tsx`): 20px corners, `shadow-modal`, a 2px backdrop
  blur, no header band. 17px medium title in the card's own 24px padding.
- **Dropdown menu** (`ui/dropdown-menu.tsx`): 14px card on `shadow-float`, 32px
  rows with 8px corners and a `muted` highlight.
- **StatusPill** (`ledger/status.tsx`): Podium's Badge. A 20px pill with a 10 to
  12% tint, a dot and an 11px medium label.
- **IconTile** (`data/icon-tile.tsx`): 8px corners, `muted` fill,
  `muted-foreground` icon in both themes.
- **Banner** (`ui/banner.tsx`): Podium's notice. A tint on a 14px inset, a 16px
  glyph, no border and no side bar.
- **EmptyState** (`ui/empty-state.tsx`, `ui/empty-art.tsx`): Podium's small
  isometric figures drawn only in sky blue, centred, a medium title, one muted
  sentence and the action that fills the list. `art=` picks the figure;
  `compact` for cards and side panels. Errors get the destructive icon tile.
- **Toasts** (`ui/toast.tsx`, sonner in `Providers.tsx`): card pills with the
  float shadow in the bottom right, the action a black pill.
- **Hook rail** (`rare/hook-sidebar.tsx`, from Rare UI, see `NOTICE`): sidebar
  sections draw a hairline accent rail that hooks into the current row and a
  faint dashed rail that follows hover and focus.

## Motion

Tokens and classes come from Podium's `styles.css`:

| Token | Value | Use |
|---|---|---|
| `--ease-podium-out` (and `--ease-out`) | `cubic-bezier(0.22, 1, 0.36, 1)` | Enter, open, move |
| `--ease-out-strong` | `cubic-bezier(0.23, 1, 0.32, 1)` | Press and pop |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | On-screen morphs |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Phone sidebar drawer |
| `--duration-press` / `quick` / `fast` / `medium` / `slow` | 120 / 150 / 250 / 350 / 500ms | |

- UI motion stays under 300ms; explanatory motion may reach 500ms.
- Enter with ease-out, never ease-in. Exits are faster than entrances.
- Never animate from `scale(0)`; start at 0.96 to 0.97 with opacity and a
  1 to 3px blur. Only transform, opacity and filter animate.
- Classes: `press`, `t-enter`, `t-stagger`, `t-pop`, `t-toast`, `t-shimmer`,
  `t-check`, `live-dot`.
- Everything collapses under `prefers-reduced-motion`.

## Iconography

lucide, as Podium uses it, imported only from `@/components/ui/icon`. 15 to
18px with a 1.7 to 1.75 stroke in navigation, 16px in buttons. One icon per
row; icons do work (navigation, a control, a type marker), never decoration.

## Accessibility

- Focus is a 2px accent outline at 55% with a 1px offset on every control.
- Every icon-only button has an `aria-label` and a `title`.
- `faint` is for secondary meta only. Labels, empty states and anything a
  person needs to read use `muted-foreground` or stronger.
- Hit targets are at least 28px in the sidebar and 32px elsewhere.

## Verify

Render the surface at 375px and 1440px in light and dark and look at it. "It
looks fine in the code" is not a check.
