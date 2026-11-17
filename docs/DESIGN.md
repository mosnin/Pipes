# DESIGN.md

How Pipes looks, moves and feels. Pipes is built on the **Podium design
system**: the same tokens, type, corners, primitives, chassis and motion as the
Podium app (`mosnin/podium`, `apps/web`). When Podium's primitives change, port
the change here rather than letting the two drift.

Pipes is its own product on those primitives. Its decorative layer is its own:
the "shift" block shader, block tiles, two shape stickers and its own sweep
palette, never Podium's gradient light, glass icons, mascots or glyph field.

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
- empty states (sky blue isometric figures, `sky`)
- a first visit or a finished milestone (the block shader)
- finishing Get started, or opening a workflow you just made (a glimm sweep)
- an agent is present: every agent owns a colour field
- the day itself: Workflows greets you on blocks whose palette follows the time of day

Chrome, text, controls and people stay neutral. Colour belongs to agents, live
moments and places where work begins; that restraint is what makes them land.

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
- **Toasts**: Ding (`src/lib/toast.tsx`), and only Ding, as in Podium. Spring
  pills that morph in place, bottom right, card surface with the float shadow;
  glyphs in `floor`, `destructive`, `queued` and `accent`; the action a black
  pill. Show one with `useToast()` from `ui/toast.tsx`. Silent.
  `tests/unit/toast-guard.test.ts` enforces it.
- **Avatar** (`ui/avatar.tsx`, on Arc's Avatar in `components/arc`): always a
  circle. People get a soft pastel from their name; agents get their colour
  field with dark initials and the asterisk badge (`AgentMark`), so agents are
  never told apart by colour alone. A photo replaces both and fades in from a
  soft blur. The ledger `Avatar` and `AuthorStamp` render it.
- **CheckCircle, Dot, Panel, SectionTitle, EmptyNote** (`ui/check-circle.tsx`,
  `ui/dot.tsx`, `ui/panel.tsx`): Podium's filled blue check that pops and
  draws, its 7px dots (blue new, orange needs-you, pulsing green live), its
  nested card, its quiet 13px section label and its inline empty row on a
  faint sky gradient.
- **Microinteractions** (`components/micro/`, from microinteractions.dev, MIT):
  - `HoldConfirm` for rare destructive actions: revoking a token, deleting a
    connection, cancelling a run. A red fill sweeps across while held (1.1s,
    linear) and snaps back in 180ms if released; a click without a hold asks
    in a dialog instead.
  - `MorphArrow` on links that take you somewhere (Open, All templates, View
    usage, Run history): the chevron grows a shaft on hover or focus.
  - `TextSwapButton` where the next step is worth saying.
- **Gooey nav** (`rare/gooey-nav.tsx`, Rare UI): tabs on a `muted` track whose
  active item splits off as a `primary` pill. The runs status filter.
- **Hook rail** (`rare/hook-sidebar.tsx`, from Rare UI, see `NOTICE`): sidebar
  sections draw a hairline accent rail that hooks into the current row and a
  faint dashed rail that follows hover and focus.

## Shaders

`ui/shader.tsx` renders Pipes' own shader, "shift": a field of square blocks on
a grid, in a duotone (a light ground and an ink) plus a middle tone mixed from
the two. The field slides slowly sideways while its rows shift in whole-block
steps, eased at each step, like work moving through pipes. Where two tones
meet, a few cells are drawn in a 4x4 ordered dither instead of a flat fill, and
a barely visible hairline grid keeps the blocks reading as a system. It was
written for Pipes, not taken from any library or shader collection.

Palettes are duotones: `sky`, `sunrise`, `bloom`, `lagoon`, `dusk`, `ember`,
`mono`. Grounds are light enough for dark text in both themes. `cell` sets the
block size (26px by default, smaller on small banners). Device pixel ratio is
capped at 1.5, rendering pauses offscreen and in hidden tabs, reduced motion
draws one still frame, and without WebGL a still CSS block pattern in the same
palette takes its place. Each effect run makes its own canvas, so a context
lost on unmount is never reused. Dark mode drops banners to about 90%
brightness. Keep it to a handful per screen.

Things that sit on a shader are **block tiles** (`BlockTiles` in
`ui/shader-banner.tsx`): square white tiles with 8px corners and a hard 3px
offset shadow in the palette's ink, joined by square pipe segments that pulse
in turn.

Where shaders go, and nowhere else:

- **Greeting band** on Workflows (`GreetingBand`): palette by the viewer's
  time of day (`sunrise` before noon, `sky` afternoon, `dusk` evening, `ember`
  after midnight), dark text on a light scrim, and one shape sticker.
- **Start cards** on Workflows (`StartCard`): New workflow (`sky`), Draft with
  AI (`bloom`), Import a schema (`lagoon`), with block tiles.
- **Intro cards** (`shell/intro.tsx`): the first time someone opens a section.
- **The Get started popover**: the next step on its own shader.
- **The celebration card** when Get started is done.
- **Sign-in and sign-up art** (`marketing/auth-art.tsx`): `dusk`, a glimpse of
  a workflow an agent is walking with one step waiting on a person.
- **Connect an agent** (`BandHeader`, `bloom`) and **Connections**
  (`BandHeader`, `lagoon`): page-opening bands with block tiles.

Agent colour fields: `paletteFor(name)` gives every agent one of six palettes,
picked from its name so it's the same everywhere it appears; small surfaces
(avatars) draw it as four blocks (`fieldGradient`). Never use an agent's field
for state.

## Stickers

`ui/stickers.tsx` (stick-it-up, MIT): two shape decals that peel on hover, a
sparkle trio and a star burst, tilted a few degrees and hidden from screen
readers. No characters. Three places only: the greeting band, the sign-in art
and the celebration card. Never on working surfaces (lists, tables, the
editor).

## Glimm

[glimm](https://glimm.dev) sweeps a band of colour across the screen. A product
you navigate dozens of times an hour should not sweep on every link, so Pipes
sweeps only when the scene changes: opening a workflow you just created (from
Workflows or Get started) and finishing Get started (behind the celebration
card). `src/lib/sweep.tsx` wraps the app in `SweepProvider` with
Pipes' chain, `accentChain(["#2f8c84", "#7f9fd0", "#e8955a"])` (the lagoon, sky and sunrise inks), at 0.85
brightness in dark mode, and offers `useSweepTo(path)` for a scene-changing
navigation. glimm handles reduced motion and missing WebGL itself.

## Onboarding

`src/lib/onboarding.tsx` and `components/shell/intro.tsx`.

- **Intro cards**: the first time someone opens Workflows, the editor, Runs,
  Approvals, Connect an agent, Connections or Triggers, a card explains it:
  block shader with three block tiles, title, one sentence, three checked
  points, a primary action and Close. The primary action does what it says
  (Connections opens the new connection form). Cards queue, so two never
  stack. Seen state is per viewer in localStorage. Tests set `pipes.intros`
  to `off`.
- **Get started**: a sidebar row with a progress ring, opening a "Getting
  started 2 of 4" popover. Steps come from real data (`GET /api/onboarding`):
  a workflow exists, an agent holds a token, a run has started, a teammate is
  in or invited. When all four are done, "You're all set" appears once with
  the glimm sweep, and the row goes away.

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
