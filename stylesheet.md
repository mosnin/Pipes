# Pipes Design System
### The one document every engineer and designer must know by heart.

This is not a suggestion. It is the law. Every pixel in Pipes is the product of deliberate decisions made here. If something you want to build isn't in this document, come back and add it before you ship it — do not invent on the fly.

---

## Stack & Libraries

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15, App Router | Server components by default. Client components marked `"use client"` only when necessary. |
| Language | TypeScript (strict) | `npx tsc --noEmit` must pass clean before every commit. |
| Styling | Tailwind CSS + `globals.css` | All design tokens live in `globals.css` `@theme` block. Never invent ad-hoc colors. |
| Component library | HeroUI v3 | Compound component API: `Card.Content`, `Dropdown.Popover`, `Tabs.List`. No `HeroUIProvider`. No `heroui()` Tailwind plugin. |
| Custom primitives | `src/components/ui/index.tsx` | Button, Input, Textarea, Select, Badge, Card, Panel, Sidebar, Topbar, Tabs, Table, EmptyState, PageHeader, SectionHeader, AvatarStack, CommentBubble, NodeTypeBadge, ValidationBadge. Prefer these over raw HeroUI everywhere. |
| Icons | Lucide React | Size: 14–18px in UI. 13px in dense toolbars. `strokeWidth` defaults (1.5–2). Never use `fill` except amber star favorites. |
| Canvas / graph | @xyflow/react (ReactFlow) | Editor canvas only. |
| Notifications | Sonner | `toast.success()`, `toast.error()`, `toast.loading()` with `id` for updates. Bottom-right position. |
| Animations | CSS transitions (Tailwind) | No GSAP. No Framer Motion. Motion should cost nothing at runtime. |
| Fonts | System font stack | Zero network cost. Never load an external font. `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| Monospace | System mono stack | `ui-monospace, "SF Mono", "Cascadia Code", "Fira Code", monospace` |
| State (server) | Convex | Real-time subscriptions in the editor. |
| State (client) | React hooks | No global state library. |
| Auth | Auth0 | Route: `/api/auth/login`, `/api/auth/logout`. |

---

## Typography

### Font Families

```css
--font-sans: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
--font-mono: ui-monospace, "SF Mono", "Cascadia Code", "Fira Code", monospace;
```

### The Four Type Utilities

These four classes are the only allowed text sizes in the application UI. Nothing else.

```css
.t-caption  { font-size: 11px; line-height: 1.4; letter-spacing: 0.003em; }
.t-label    { font-size: 13px; line-height: 1.4; }
.t-body     { font-size: 15px; line-height: 1.6; }
.t-title    { font-size: 17px; line-height: 1.4; font-weight: 600; letter-spacing: -0.01em; }
```

**Rule:** Use `t-caption` for metadata, timestamps, tags. Use `t-label` for labels, button text, form labels, nav items. Use `t-body` for paragraphs and descriptions. Use `t-title` for card headings and section titles.

### Marketing / Hero Headlines

Marketing pages break from the four-utility rule only for display text. Always pair with tight tracking.

| Level | Size | Weight | Tracking | Line height |
|---|---|---|---|---|
| Display (hero h1) | `text-5xl` → `text-[72px]` | 700 | `-0.04em` | 1.04 |
| Section (h2) | `text-3xl` → `text-4xl` | 700 | `-0.03em` | 1.1 |
| Card heading (h3) | `text-2xl` → `text-[22px]` | 700 | `-0.02em` | 1.2 |
| App heading (h1 in-app) | `text-2xl` | 700 | `-0.03em` | 1.1 |

**Rule:** Every heading element (`h1`–`h6`) globally gets `letter-spacing: -0.03em; line-height: 1.1; font-weight: 700` via the base reset in `globals.css`. Never fight this. Use it.

### Font Weights

| Weight | Usage |
|---|---|
| 400 | Body text, secondary descriptions |
| 500 | Navigation items, form labels (use sparingly) |
| 600 | `.t-title`, subheadings, card titles |
| 700 | All `h1`–`h3`, display headlines, CTA buttons |
| 800+ | Display numbers on pricing/stats only |

### Text Color Hierarchy

This is the hierarchy. Apply it without exception.

```
Primary   → text-[#111]     ← headings, body text, active labels
Secondary → text-[#3C3C43]  ← supporting copy, descriptions
Muted     → text-[#8E8E93]  ← timestamps, metadata, placeholder labels
Disabled  → text-[#C7C7CC]  ← input placeholders, inactive states
Accent    → text-indigo-600  ← links, active icons, prices
```

**Never use:** `text-slate-*`, `text-gray-*`, `text-foreground`, `text-default-*`, or any HeroUI semantic color token in application code. These are violations.

---

## Color System

### Primary Palette

```
Accent       #4F46E5   indigo-600  — used maximum 2× per screen
Accent hover #4338CA   indigo-700
Accent light #EEF2FF   indigo-50   — badge backgrounds, selected states
```

### Surface Palette

```
Page (app)       #FFFFFF   white       — main content area
Page (marketing) #FFFFFF   white       — always white
Surface / chrome #F5F5F7               — sidebar, settings panels, app background ring
Card             #FFFFFF   white       — always white, separated by border not background
```

### Text / Ink Palette (see Typography above)

```
Ink 1   #111111   — primary
Ink 2   #3C3C43   — secondary
Ink 3   #8E8E93   — muted
Ink 4   #C7C7CC   — placeholder / disabled
```

### Border Palette

```
Default   border-black/[0.08]   rgba(0,0,0,0.08)   — all cards, inputs, panels
Strong    border-black/[0.12]   rgba(0,0,0,0.12)   — hover states, emphasis
Subtle    border-black/[0.06]   rgba(0,0,0,0.06)   — dividers within components
Line      border-black/[0.05]   rgba(0,0,0,0.05)   — toolbar separators
```

### State Colors

| State | Text | Background | Border |
|---|---|---|---|
| Success | `text-emerald-500` | `bg-emerald-50` | `border-emerald-200` |
| Error / danger | `text-red-500` | `bg-red-50` | `border-red-200` |
| Warning | `text-amber-600` | `bg-amber-50` | `border-amber-200` |
| Info / accent | `text-indigo-600` | `bg-indigo-50` | `border-indigo-200` |
| New / highlight | `text-indigo-600` | `bg-indigo-600` (banner) | — |

### Category / Tag Colors (node library)

Used exclusively for node type badges in the system editor.

```
I/O        bg-sky-100 text-sky-700
Reasoning  bg-indigo-100 text-indigo-700
Core       bg-emerald-100 text-emerald-700
Data       bg-amber-100 text-amber-700
Control    bg-orange-100 text-orange-700
```

### Dark Mode

Not implemented. The app is light-only. Do not add dark mode variants until the design system is explicitly updated.

---

## Spacing Scale

### Base Unit

4px (Tailwind default). All spacing values are multiples of 4.

### Page-level Spacing

| Context | Rule |
|---|---|
| App page padding | `px-4` to `px-6` horizontal, `py-6` to `py-10` vertical |
| Marketing page padding | `px-6` horizontal — always |
| Marketing section vertical | `py-20` (80px) between major sections |
| Max content width (marketing) | `max-w-5xl` to `max-w-7xl mx-auto` |
| Max content width (app settings) | `max-w-3xl` |
| Connect / onboarding | `max-w-xl` |

### Component Spacing

| Component | Padding |
|---|---|
| Card (default) | `p-4` (16px) |
| Card (comfortable) | `p-5` to `p-7` (20–28px) |
| Button (sm) | `px-2 py-1` |
| Button (md, default) | `px-4 py-2` to `px-5 py-2.5` |
| Button (lg) | `px-8 py-3` to `px-10`, `h-11` to `h-[46px]` |
| Input | `px-3 h-10` |
| Nav item | `px-3 py-2.5` |
| Section header | `mb-6` below heading, `mb-10` to `mb-12` for major sections |
| Stack gap (tight) | `gap-1` to `gap-2` |
| Stack gap (normal) | `gap-3` to `gap-4` |
| Stack gap (loose) | `gap-6` to `gap-8` |
| Grid columns | `gap-4` to `gap-6` |

---

## Border & Radius

### Radius System

Three radii. Nothing else.

```
8px   rounded-lg    — inputs, small buttons, tags, inline code blocks
12px  rounded-xl    — cards, panels, nav items, dropdowns
16px  rounded-2xl   — modals, large cards, auth page cards
24px  rounded-[24px] — marketing final-CTA blocks only
```

Pill (rounded-full) is allowed only for badges and avatar stacks.

Button radius: `10px` via `style={{ borderRadius: "10px" }}` — sits between `rounded-lg` and `rounded-xl`, intentionally.

### Border Rules

- **Cards:** Always `border border-black/[0.08]`. Never a shadow instead.
- **Inputs:** `border border-black/[0.08]`. On focus: `border-indigo-400`.
- **Panels (editor):** `border border-black/[0.08]`.
- **Dividers:** `<div className="h-px bg-black/[0.06]" />` — never `<hr>` or `<Separator>` for inline dividers.
- **Hover borders:** `hover:border-black/[0.14]` or `hover:border-indigo-300`.

**Shadows vs borders:** Shadows are almost never used. Borders define structure. The one exception is the active navigation item, which uses a micro-shadow to feel "lifted" off the sidebar surface:
```
shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)]
```

---

## Shadows

The design language is flat. Borders create separation, not depth.

| Level | Value | When to use |
|---|---|---|
| None | — | 95% of the time |
| Lifted | `shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)]` | Active nav item only — conveys "selected" without color |
| Modal | Native browser + `rounded-2xl border border-black/[0.08]` | Modals and drawers |
| Drag | `shadow-lg` | Only during active drag-and-drop operations |

**Rule:** If you are reaching for `shadow-sm` on a static card, use a border instead.

---

## Components

### Buttons

All button text is `font-semibold` minimum. All buttons use `transition-colors duration-150`.

#### Primary
```
bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800
height: h-10 (default) | h-11 or h-[46px] (large CTA)
border-radius: 10px
padding: px-5 (default) | px-8–px-10 (large)
```

#### Secondary (outline)
```
bg-white border border-black/[0.08] text-[#111]
hover:border-black/[0.14] hover:bg-black/[0.02]
Same sizing as primary
```

#### Ghost
```
bg-transparent text-[#3C3C43] hover:text-[#111] hover:bg-black/[0.04]
Used in toolbars and nav. Never for primary actions.
```

#### Dark (hero/auth CTAs)
```
bg-[#111] text-white hover:bg-[#222] active:bg-black
Used only for the most important action on a screen (login, signup, final CTA).
```

#### Danger soft
```
bg-red-50 text-red-600 hover:bg-red-100
Used in destructive toolbar actions (Delete node, Archive).
```

#### Sizing
| Size | Height | Padding | Text |
|---|---|---|---|
| sm | h-7 to h-8 | px-2 py-1 | t-caption |
| md (default) | h-10 | px-4 | t-label |
| lg | h-11 to h-[46px] | px-8 | t-label font-semibold |

#### Rules
- One primary button per screen (or per distinct action zone).
- Toolbar buttons: ghost, size sm, icon + label.
- Loading state: replace content with `<Spinner size="sm" />`.
- Disabled: `isDisabled` prop, never manual opacity hacks.

---

### Inputs

```
height: h-10
border: border border-black/[0.08]
border-radius: rounded-lg (8px)
padding: px-3
text: t-label text-[#111]
placeholder: placeholder:text-[#C7C7CC]
focus: focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400
error: border-red-400 bg-red-50 focus:ring-red-200 focus:border-red-400
transition: transition-shadow
```

Error message below input: `<p className="t-caption text-red-500">`

Label above input: `<label className="t-label font-medium text-[#111]">` with `htmlFor` always set.

---

### Cards

```
bg-white border border-black/[0.08] rounded-xl (12px)
Padding: p-4 (default) | p-5–p-7 (comfortable)
No shadow.
```

Hover card (clickable):
```
hover:border-indigo-300 transition-colors duration-150 cursor-pointer
```

Highlighted/selected card:
```
border-indigo-500 bg-indigo-50/60
```

---

### Panels (Editor)

Panels are the left/center/right columns in the editor. They are Cards with a titled header.

```
title: t-label font-semibold text-[#111]
header padding: px-4 pt-4 pb-0
content padding: p-4
border: border border-black/[0.08]
background: bg-white
```

---

### Modals

```
border-radius: 16px (rounded-2xl)
border: border border-black/[0.08]
background: bg-white
max-width: varies (max-w-md for simple, max-w-2xl for complex)
padding: p-6 to p-8
backdrop: bg-black/40
```

---

### Badges & Tags

```
Chip (HeroUI): variant="soft", size="sm"
Custom pill: t-caption font-semibold px-2 py-0.5 rounded-full border
Category badge (node library): inline-flex w-6 h-6 rounded text-[10px] font-bold
```

Status/tone system:
```
neutral  → default chip color
good     → success chip / text-emerald-500 + bg-emerald-50
warn     → warning chip / text-amber-600 + bg-amber-50
error    → danger chip / text-red-500 + bg-red-50
accent   → text-indigo-600 + bg-indigo-50 + border-indigo-200
```

---

### Tables

Use HeroUI `Table` via the custom `Table` primitive for simple data tables. For complex data (settings pages), use raw `<table>` with:

```
thead: border-b border-black/[0.08]
th: t-label font-semibold text-[#3C3C43] px-4–px-6 py-3–py-4 text-left
tr (alternating): bg-white / bg-[#F5F5F7]
td: t-label text-[#3C3C43] px-4–px-6 py-3–py-4
container: bg-white rounded-xl border border-black/[0.08] overflow-hidden
```

---

## Navigation

### App Sidebar (AppShell)

```
Width: 216px, fixed, full height
Background: #F5F5F7
Border: none (separation via background contrast with white main)
Brand mark: h-7 w-7 rounded-lg bg-indigo-600 + GitBranch icon white
Brand text: 17px font-semibold text-[#111] -tracking-wider
```

Nav item:
```
height: py-2.5 px-3 rounded-xl
inactive: text-[#3C3C43] hover:text-[#111] hover:bg-white/70
active: bg-white text-[#111] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)]
icon inactive: text-[#8E8E93] → text-[#3C3C43] on hover
icon active: text-indigo-600
font: text-[13px] font-medium
```

User row (bottom):
```
Avatar: 24×24 rounded-full
Name: t-label font-semibold text-[#111]
Plan: t-caption text-[#8E8E93]
Logout: p-1.5 rounded-lg text-[#8E8E93] hover:text-red-500 hover:bg-red-50
```

Divider above user row: `<div className="my-2 h-px bg-black/[0.06] mx-1" />`

---

### Settings Sidebar (SettingsShell)

```
Width: 220px
Background: #F5F5F7
Border-right: border-black/[0.08]
Padding: px-3 py-6
```

Section heading:
```
text-[11px] font-semibold tracking-wider text-[#8E8E93] uppercase
```

Nav item:
```
t-label font-medium rounded-lg px-2 py-2
inactive: text-[#3C3C43] hover:bg-black/[0.04]
active: bg-indigo-50 text-indigo-700
icon: size={16} strokeWidth={1.75}
```

---

### Marketing Navbar (MarketingShell)

```
Height: h-16
Background: bg-white/80 backdrop-blur-md (→ bg-white/90 backdrop-blur-lg on scroll)
Border-bottom: border-black/[0.06] (→ border-black/[0.08] + shadow-sm on scroll)
Position: sticky top-0 z-50
```

Nav links (center):
```
t-label font-medium text-[#8E8E93] hover:text-[#111]
px-3.5 py-2 rounded-lg hover:bg-black/[0.04]
```

Primary CTA:
```
bg-indigo-600 hover:bg-indigo-700 text-white
px-4 py-2 t-label font-semibold
border-radius: 10px
```

---

### Editor Toolbar

**Primary toolbar** (always visible):
```
height: pt-2.5 pb-1.5
background: bg-white border-b border-black/[0.08]
actions: ghost sm buttons with icon + label
separators: <Separator orientation="vertical" className="h-5 mx-1" />
```

Primary toolbar item groups (left to right):
1. Undo / Redo
2. Insert / Fit (always)
3. Dupe / Delete / Group (contextual — only when something selected)
4. Validate (with error count badge)
5. Agent View (indigo-accented, always visible)

**Secondary toolbar** (power tools, de-emphasised):
```
border-top: border-black/[0.05]
padding-top: pt-1
items: ghost sm, text-[#8E8E93] hover:text-[#3C3C43]
```
Visible items: Simulate · AI · Chat
Overflow (··· More dropdown): Arrange · Comments · Versions · Export/Import

---

## Visual Hierarchy Rules

### The Rule of One

Every screen has one primary action. One. Everything else is secondary or hidden.

- One primary button per view (or per distinct task zone).
- One accent color touch per component (icon OR border OR background, not all three).
- One hero message per page (the headline — never compete with a subheading).

### Size → Weight → Color → Position

When creating hierarchy, apply in this order:

1. **Size first** — bigger = more important. Use the type scale.
2. **Weight second** — bold before color.
3. **Color third** — indigo accent only for the most important interactive element.
4. **Position last** — top-left reads first; use it for what matters most.

### Primary vs Secondary vs Tertiary

| Level | Treatment |
|---|---|
| Primary | `text-[#111]`, bold/semibold, full opacity |
| Secondary | `text-[#3C3C43]`, regular weight |
| Tertiary / muted | `text-[#8E8E93]`, t-caption or t-label |
| Disabled / placeholder | `text-[#C7C7CC]` |
| Accent | `text-indigo-600`, used to draw the eye once |

### What Always Stands Out

- The indigo brand mark in navbars and auth pages.
- The primary CTA button (only one per screen; always `bg-indigo-600` or `bg-[#111]`).
- Validation errors (amber or red, never silent).
- The selected item in any list or canvas (indigo border).
- The system name in the editor header.

---

## Animation & Interactions

### Transitions

```
Fast (state changes): duration-150
Medium (panels, menus): duration-200
Slow (page-level, banners): duration-300
```

Easing: Tailwind defaults (`ease-in-out`). Never custom cubic-bezier unless for a deliberate spring.

### Hover States

```
Color transitions: transition-colors duration-150
Border transitions: transition-all duration-150
Background: hover:bg-black/[0.04] (ghost areas)
Link: hover:text-[#111] (from secondary/muted)
Card hover: hover:border-indigo-300 (from border-black/[0.08])
```

### Focus States

All interactive elements must have a visible focus ring:
```
focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2
```
For inputs specifically: `focus:ring-indigo-100 focus:border-indigo-400` (ring inside, no offset).

### Loading States

- Button loading: swap content for `<Spinner size="sm" />`, keep button width stable.
- Page/section loading: `<SkeletonCard />` or `animate-pulse` placeholder with `rounded-xl bg-white border border-black/[0.08]`.
- Full-screen loading: `<Spinner size="lg" />` centered in `min-h-[60vh]`.

### Empty States

```
border border-dashed border-black/[0.12] rounded-xl p-10
heading: t-label font-semibold text-[#111]
description: t-caption text-[#8E8E93]
action: primary or ghost button below description
Optional visual: mini inline node-graph illustration (SVG boxes + connectors)
```

### Skeleton Loading

```
<SkeletonCard /> — rounded-xl bg-white border border-black/[0.08] animate-pulse
Use for: settings pages, dashboard cards, any async content zone
Never use a spinner for content that has a known shape
```

---

## Dashboard

### Layout Structure

```
Full-height flex: sidebar (216px) + main (flex-1 overflow-y-auto bg-white)
Top of main: sticky header with search + "New System" button
Body: grid of SystemCard components (1 col sm, 2 col md, 3 col lg, 4 col xl)
```

### System Cards

```
bg-white border border-black/[0.08] rounded-xl
hover: border-indigo-300 cursor-pointer transition-colors
title: t-label font-semibold text-[#111] (→ text-indigo-600 on hover)
description: t-caption text-[#8E8E93] line-clamp-2
footer: tags (Chip soft sm) + relative timestamp (t-caption text-[#8E8E93])
overflow menu: MoreHorizontal icon button, ghost, top-right
```

### Empty State (no systems)

```
min-h-[70vh] flex center
Visual: mini node graph (Input → Agent → Output, indigo-accented center node)
Headline: "Draw your first system" text-2xl font-bold text-[#111]
Body: t-body text-[#3C3C43] max-w-sm text-center
CTAs: "Start from scratch" (primary) + "Browse templates" (outline) side by side
Below: "Connect a system to an agent" indigo pill link
```

---

## Auth Pages

### Shared Layout

Both login and signup share this shell:

```
Background: min-h-screen bg-[#F5F5F7] flex items-center justify-center px-6 py-12
Container: w-full max-w-[400px]
```

Structure (top to bottom):
1. **Brand mark** — centered, outside the card, 32px spacing below
2. **Card** — `bg-white border border-black/[0.08] rounded-2xl px-8 py-9`
3. **Footer** — centered `t-caption text-[#C7C7CC]` with `ShieldCheck` icon

### Brand Mark (auth pages)

```
flex items-center justify-center gap-2.5 mb-8
Icon container: h-9 w-9 rounded-xl bg-indigo-600
Icon: GitBranch size={18} text-white
Text: text-[22px] font-bold text-[#111] -tracking-wider
```

### Login Card

```
Heading: text-[22px] font-bold text-[#111] -tracking-wider centered
Subheading: t-label text-[#8E8E93] centered
Divider: h-px bg-black/[0.06]
CTA: h-11 bg-[#111] hover:bg-[#222] text-white font-semibold rounded-xl w-full
     — includes provider icon (Google SVG, 16×16) + "Continue with Google"
Secondary: t-caption text-[#8E8E93] centered — "No account yet? Sign up free" (indigo link)
```

### Signup Card

```
Heading: text-[22px] font-bold text-[#111] left-aligned
Subheading: t-label text-[#8E8E93] left-aligned — "Free forever. No credit card required."
Benefits list: 3 items, Check size={14} text-indigo-500, t-label text-[#3C3C43]
Divider: h-px bg-black/[0.06]
Labels: t-label font-medium text-[#111] with htmlFor
Inputs: h-10 border-black/[0.08] focus:ring-indigo-100 focus:border-indigo-400
Error inputs: border-red-400 bg-red-50 focus:ring-red-200
Error text: t-caption text-red-500
Submit: h-11 w-full bg-[#111] hover:bg-[#222] text-white font-semibold rounded-xl
Sign-in link: t-caption text-[#8E8E93] centered — "Already have an account? Sign in"
```

### Brand Expression Rules for Auth Pages

- The product is introduced by the brand mark above the card — not inside it. The mark stands alone in open space before the user encounters the form.
- The card contains only one primary action. One.
- Trust signal (`ShieldCheck` + security note) lives below the card, grayed out (`#C7C7CC`), never competing with the CTA.
- No marketing copy on auth pages. No feature lists. No testimonials. The user already decided to sign up — respect that decision and get out of their way.

---

## The Rules That Cannot Be Broken

1. **No `slate-*`, `gray-*`, `foreground`, `default-*`, or HeroUI semantic tokens in application code.** Use the ink system. Always.

2. **No shadows on static cards.** Borders define structure. Shadows are earned.

3. **One primary button per screen.** If you have two, one of them is wrong.

4. **Tight tracking on every heading.** Minimum `-0.02em`. Marketing display: `-0.04em`.

5. **The accent color (indigo-600) appears at most twice per screen.** An accent everywhere is an accent nowhere.

6. **`npx tsc --noEmit` must pass before every commit.** Type safety is not optional.

7. **No external fonts.** System fonts only.

8. **No inline `style={{}}` except for `borderRadius` values that don't map cleanly to Tailwind classes, or `letterSpacing` fine-tuning on display headlines.** Everything else is a class.

9. **Every interactive element has a visible focus ring.** Keyboard accessibility is not an afterthought.

10. **Empty states are invitations, not apologies.** Use a visual, a clear headline, and one action.

---

*Last updated: 2026-05-16. This document is the source of truth. The code reflects it. If they diverge, fix the code.*
