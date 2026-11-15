# Design

This file is the design brief for Company OS: what the founder asked for, in
their words where it matters, and how each ask became a rule, a token or a
class in the codebase. It sits between two other documents.

- [anti-slop.md](anti-slop.md) is the rule set. Twenty-one blocking rules. A
  surface with an open violation does not ship.
- [docs/DESIGN_LANGUAGE.md](docs/DESIGN_LANGUAGE.md) is the visual contract:
  every token, every type role, every component's anatomy and states. Where
  it gives a value, use that value.

Read this file first, then the rules, then the language. This file says what
the product is trying to be; the other two say how to tell whether a surface
got there.

---

## 1. The standard

These are the founder's standing instructions. They apply to every surface,
every phase, every pull request.

- **Do not cut corners.** Finish the whole surface. A half-built page is worse
  than no page, because it is the thing that ends up live.
- **Enterprise grade, like Shopify.** The bar is a product a company runs its
  business on: settled, dense where it needs to be, calm everywhere else,
  never showy.
- **An Apple-level aesthetic that matches our branding.** Restraint, one
  accent, type that does the work, support text lighter rather than heavier,
  units on baselines, nothing decorative.
- **Both themes, always.** Every surface is designed in light and dark, from
  the same tokens. Neither theme is an afterthought or an inversion of the
  other.
- **Render it and look.** Every surface is rendered at 375px and 1440px in
  both themes before it ships. Some rules (spacing, contrast, whether a
  surface is actually differentiated) exist only in pixels. "It looks fine in
  the code" is not a check.
- **No side drawers.** Anti-slop rule 21. Detail opens on a page of its own
  or in a centred dialog, never a panel sliding in from the edge.
- **If we need external tech, build it in and say what we need.** Stripe for
  payments, Resend for email, Wasabi for files: the integration ships, and
  the operator is told exactly which variables make it live
  (`docs/DEPLOYMENT.md`).
- **Every phase merges.** Work lands on `main` through a pull request when it
  is verified, not in a long-lived branch.

---

## 2. The reference: the Shopify admin

The application is built to the Shopify admin. Twenty of its screens are
measured in `docs/SHOPIFY_MEASUREMENTS.md`, which records every number
below, the pixel column it was read from, and the two readings that were
wrong the first time. Nothing here is estimated.

| Property       | Light                                       | Dark                         |
| -------------- | ------------------------------------------- | ---------------------------- |
| Bar            | `#0a0a0a`, 56px, full width                 | `#0d0d0d`                    |
| Bar field      | `#282828`, 640 x 36, centred on the viewport | `#2a2a2a`                    |
| Canvas (pane)  | `#f1f1f1`                                   | `#212121`                    |
| Rail           | `#ebebeb`                                   | `#131313`                    |
| Raised surface | `#ffffff` plus a `#e2e2e2` edge             | canvas plus a `#353535` edge |
| Selected rail row | `#fafafa`, a step ABOVE the rail         | `#2e2e2e`                    |
| Primary ink    | `#0d0d0d`                                   | `#f3f3f3`                    |
| Rail width     | 240px                                       | same                         |
| Rail row       | 28px pitch, 8px radius, 18px icon           | same                         |
| Body corner    | 10px, where the sheet meets the bar         | same                         |
| Controls       | 28px buttons, 32px inputs, 8px radius       | same                         |
| Cards          | 12px radius, `#e2e2e2` edge, `#cdcdcd` under | same                        |
| Table row      | 53px, on a 35px `#f7f7f7` header row        | same                         |
| Page gutter    | 16px, at every width                        | same                         |
| Type           | 13 body · 12 caption · 14 card · 20 title   | same                         |

Two things define the shape, and neither is the palette.

**The bar spans the viewport, above both the rail and the pane.** The rail
is not the tallest thing on screen; the bar is, and the body beneath it —
rail and pane together — is one sheet that turns a corner where the two
meet. Nothing else about the frame reads right until that is true.

**It is a dense product, and it is dense in its type first.** The scale
here runs two steps smaller at every rung than the one it replaced. An
early pass changed the palette and kept the old 15px body; it read as the
same application in grey.

The principle behind the numbers is unchanged: **separation by line, not by
fill or shadow.** A card in dark mode is the canvas plus its border,
because a drop shadow is invisible on `#212121` and a lighter fill turns a
page into a pile of grey rectangles.

---

## 3. The programme: the UX honeycomb

The founder asked for the UX honeycomb (Morville) to be applied wherever it
was high leverage, with a full audit of usefulness first and progressive
disclosure of everything that is not core. The audit and outcome are on the
published page "Company OS Honeycomb Audit"; the shape of what shipped:

| Facet          | What the ask was                                                                                           | What it became                                                                                                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Useful**     | Emphasise the core features. Disclose the rest in increments so nobody feels overwhelmed.                  | One inbox for everything waiting on a person. Direction as a page. A rail whose core rows never fold and whose other groups open only when you are inside them.                                                               |
| **Usable**     | Intuitive and self-explanatory, with architectural changes where needed.                                   | One address per row. Section names that say what they hold (Tables, Research, Company profile). The App Store inside the shell. A branch chip that follows you off a branch.                                                  |
| **Desirable**  | Small micro-interactions and satisfying feedback.                                                          | Undo on every row commit, on the toast itself. A setup step lands with one beat, only on the transition. Nothing fades in on scroll.                                                                                          |
| **Findable**   | Intuitive navigation, structured information, effective search, consistency, hierarchy.                    | A mobile crumb with a way up. Recents in search. Metric cells that link to the metric's page. Tables grouped by the app that owns them.                                                                                       |
| **Accessible** | Inclusive by design; an accessible design system.                                                          | A skip link first in tab order. Sideways-scrolling tables reachable by keyboard. Every meter named. Inline links underlined at rest. axe-core clean on app and site, both themes.                                             |
| **Credible**   | Transparency on data storage, testimonials, expertise, team, contact, trust on payment pages, a changelog. | "Where it lives" on the security page, read off the code. One Stripe sentence on every payment screen. `/changelog` and "What's new". A Contact column. Testimonial and team slots that ship empty and never invent a person. |
| **Valuable**   | Value to the user and to the business.                                                                     | Export on every plan, said on every payment screen. Prices shown before approval. A public record of shipping.                                                                                                                |

**Progressive disclosure, as a rule.** Core rows (Overview, Inbox, Direction,
Import) are always visible. Departments, apps, tables, research, and the
access and billing group fold and remember their state per browser. A page's
first screen shows the thing the person came for; secondary actions sit
below the fold or behind a tab. Nothing is hidden that the person needs to
decide; nothing is shown that they do not need yet.

---

## 4. Colour

The founder's brief, in its own words, then the implementation.

> This is the most important part of UX. Choosing the right colour palette
> can increase user satisfaction and overall conversions. Primary colours are
> often used as accent colours. Palettes need to be consistent throughout the
> entire application. The colours should give an Apple-level aesthetic and
> match our branding.

### 4.1 One accent, one meaning

`--accent` is the brand's single hue: blue, `#2563eb` in light and `#5b9cff`
in dark. It appears in exactly these places and nowhere else:

- the primary button (`--action-fill`),
- links inside prose (`.t-link`, colour `--accent-text`),
- the checked state of a checkbox, radio or switch,
- the focus ring (`--focus-ring`),
- text selection (`--selection`).

Wherever the accent appears it means one thing: **this is where you act.**
It is never a status, never a surface tint, never decoration. That scarcity
is what makes it read. Ink fills that are not actions (a selected filter
chip, a key tile, a dark tile in an illustration) use `--surface-inverse`, so
the accent is not diluted by things that merely want to look solid.

Measured: label on the accent fill 5.2:1 (light) and 6.3:1 (dark); link text
6.6:1 and 7.8:1 on the canvas.

### 4.2 Everything else is chrome or signal

Structural chrome is monochrome: grounds, borders, secondary and ghost
buttons, navigation, tabs, chips, avatars, typography. Colour beyond the
accent is a **signal a person has to decode**, and each signal has one job:

| Signal     | Job                                              | Light mark | Dark mark |
| ---------- | ------------------------------------------------ | ---------- | --------- |
| `positive` | done, on track, merged, paid                     | `#14874a`  | `#2fbe6b` |
| `caution`  | slipping, waiting, due soon                      | `#b87708`  | `#e3a02b` |
| `critical` | late, failed, blocked, destructive               | `#cc3227`  | `#ef5a4c` |
| `info`     | current, informational                           | `#0c8a93`  | `#29b4be` |
| `agent`    | a machine did this (also the first chart series) | `#6e60d7`  | `#815dda` |
| `neutral`  | no state                                         | `#98a0ac`  | `#6b7480` |

Each signal has a text tone, a mark, a wash and a border token, and each pair
was measured on the card, the canvas and its own wash (4.5:1 for text, 3:1
for marks). Colour is never the sole carrier: every status dot has a label,
every delta has a glyph, human and agent are told apart by shape.

### 4.3 Consistency

The site and the app read the same tokens (`app/globals.css`); the site adds
nothing but a larger heading scale and three section spacings
(`app/marketing.css`). There is no second palette anywhere. A colour that is
not a token does not ship; `scripts/lint-css-tokens.mjs` enforces it.

---

## 5. Typography

The founder's brief, then the implementation.

> A sans serif, complementary and correctly sized, for a clean polished
> aesthetic that matches our branding. The correct face in specific areas at
> different sizes to convey a premium feel, consistent throughout.
>
> Size needs a clear hierarchy and weight. Subtext is always lighter,
> following UX laws, elegant like Apple. Weight can separate roles (for
> example, some weight on an input title). For elegance, make secondary text
> a lighter grey in light mode and a darker one in dark mode, instead of
> adding weight. Dark text for primary content, lighter for support, and the
> reverse in dark mode.
>
> Body text reads easier with a little spacing between lines. Not much; too
> much looks terrible. This does not apply to headings. Body is 15px and up,
> left aligned, sentence case.
>
> Units sit on price baselines for pricing and metrics.
>
> Heading text feels too loose by default. Caps cramp without space. Body is
> fine as is.

### 5.1 The faces

**Geist Sans** carries the interface and the site. The dashboard the product
is styled after sets its own proprietary grotesque; Geist is the open face
closest to it in figure shapes and x-height, drawn for developer products,
with unambiguous figures and a weight range wide enough that hierarchy comes
from 400 against 600. **Geist Mono** sets every identifier: hashes, sequence
numbers, slugs, endpoints, key prefixes, branch refs. The two were drawn
together, so a hash inside a sentence reads as the same voice at a different
pitch. Neither is a framework default and neither is on rule 14's banned list.

### 5.2 Hierarchy by colour before weight

The text ramp does the work the brief describes:

| Tier                | Light     | Dark      | Role                                             |
| ------------------- | --------- | --------- | ------------------------------------------------ |
| `--text-primary`    | `#0d0d0d` | `#f3f3f3` | The thing being read: titles, values, body.      |
| `--text-secondary`  | `#4b4b52` | `#b0b0b5` | What supports it: descriptions, inactive labels. |
| `--text-tertiary`   | `#66666e` | `#98989d` | Meta: captions, timestamps, axis labels.         |
| `--text-quaternary` | `#707077` | `#8a8a8f` | Small readings and placeholders.                 |

Support text is **lighter, never lighter-weight**. In light mode it is a
lighter grey; in dark mode a darker one. Weight is reserved for role: a
list-row title (`body-strong`), a field label (`caption-medium`), a tab. It
is not used to make a sentence outrank its caption; colour does that. Every
tier clears 4.5:1 on the darkest ground it can sit on (secondary 7.3:1 and
6.1:1, tertiary 4.8:1 and 4.6:1 on `--track`; quaternary 4.9:1 and 4.7:1 on
the canvas).

### 5.3 The scale and the three rules it obeys

Every piece of text takes one `t-*` role from `docs/DESIGN_LANGUAGE.md` §3.4.
An ad-hoc size is a review failure. The roles obey:

- **Headings are tight.** `display` 36/40 at −0.026em, `title-1` 28/32 at
  −0.022em, `title-2` 24/28 at −0.018em, `title-3` 20/24 at −0.014em,
  `title-4` 17/22 at −0.010em. Tracking grows with size. A heading set at
  body leading reads loose and cheap.
- **Body breathes a little.** `body` is 15/22 (1.47) and `body-read`, for
  document prose only, is 16/26. Left aligned, sentence case, never centred.
  More leading than that and a paragraph falls apart.
- **Caps get air.** `label-caps` carries +0.08em and `group-label` +0.07em.
  Capitals at body tracking cramp.

Two more the brief asked for:

- **Units sit on the baseline.** A price and its unit (`£49` and `a month`),
  a metric and its suffix, share one baseline in a `flex items-baseline` row.
  The unit is a lighter, smaller role, never superscript, never floated.
- **Field labels are sentence case, medium weight, primary ink.** The weight
  marks the label's role, as the brief describes. The uppercase role belongs
  to table headers and stat strips, not to inputs.

### 5.4 Where each role lives

| Where                                    | Role                                          |
| ---------------------------------------- | --------------------------------------------- |
| Page title                               | `title-1` (`display` on the four hero routes) |
| Section heading                          | `title-2`                                     |
| Card and panel title                     | `title-3`                                     |
| Sub-section, empty-state title           | `title-4`                                     |
| Navigation row, table cell, description  | `body`                                        |
| Active nav row, button label, crumb      | `body-medium`                                 |
| List-row title, tab, toast title         | `body-strong`                                 |
| Helper text, meta, second line           | `caption`                                     |
| Field label, chip, small button          | `caption-medium`                              |
| Column header, stat caption, status pill | `label-caps`                                  |
| Stat value                               | `metric-stat` (tabular)                       |
| Any identifier                           | `mono-hash`, `mono-seq`, `mono-code`          |
| Site headline                            | `t-mk-hero`, capped at 56px                   |

---

## 6. Layout and spacing

- One 4pt scale, twelve steps from 2px to 64px, remapped onto Tailwind's
  numeric utilities. The site adds three section steps, 80 / 112 / 128, and
  nothing else off the scale.
- Control heights are metrics, not spacing: 28 / 32 / 36 / 44px.
- Radius: 8px buttons, 10px inputs and rail rows, 12px cards and dialogs,
  full for pills.
- Page gutter 48px from 1024 up, 24px below; header 56px; rail 288px.
- Wide content scrolls inside its own container and is a keyboard tab stop.
  The page never scrolls sideways.

---

## 7. Motion

Motion is feedback for a change of state, never a way to reveal content.
Layer entry (menus, popovers, toasts) is 200ms ease-out; state changes are
90 to 140ms. The two celebratory motions in the product are a commit node's
single ring and the setup Done pill landing once. Under
`prefers-reduced-motion` every duration drops to nothing except opacity
crossfades, which keep 90ms so state changes remain perceptible.

---

## 8. Icons, and the rule they work under

Icons come from Phosphor, through `components/ui/icon.tsx`, which is the
only place the set or the weight is chosen. **Two weights, and the line
between them is a measurement:** crop the reference at 3x and its rail is
flooded — a solid house, a solid tray, a solid tag — while the magnifier
eight rows to the right, inside the table card, is a hairline outline. So
navigation is `fill` and marks where you are; everything inside the page
is `regular` and marks what you can do. Getting the two the wrong way
round is visible immediately: a filled magnifier is a solid disc with a
handle, and reads as a lollipop rather than as search.

Almost every icon is bound to a document kind or a department, not a
feature: identification work, which rule 8 allows. The constraint that
keeps this from being wholesale use: **an icon has to be the only thing
carrying its information.** No icon sits beside a label that already says
the same word. If deleting an icon loses nothing, delete it.

---

## 9. Verification, every time

Before a surface goes into a pull request:

1. Render at 375px and 1440px, light and dark, and look.
2. Run axe-core over it in both themes. Zero findings is the bar.
3. Run the gate: `npm run lint && npm run typecheck && npm test && npm run build`.
4. Check the twenty-one rules in `anti-slop.md`.
5. Record any exception below, in writing, before the code ships.

---

## 10. Argued exceptions

When a rule genuinely must be broken, argue the exception in writing at the
point of use, in a comment a reader hits before the code, and record it here
naming the rule, the surface and why this case is different. An exception
that is not written down is a violation. Nothing else is exempt.

### Rule 9, the icon set

Rule 9 makes an icon set a typeface-level decision needing a stated
rationale, and names a default set dropped in everywhere as a finding. The
set is Phosphor and the rationale is the paragraph in section 8 above,
repeated at the top of `components/ui/icon.tsx`: the reference draws
filled navigation glyphs and Lucide, which this replaced, has one weight
and it is a hairline outline. At 16px on a 28px row that is the loudest
single difference between a recreation and the thing it recreates.

What keeps this from being "a default set dropped in": one import path
owns the vocabulary and both weights, so the decision exists in one file
rather than in the 115 that draw icons. The 190 names exported there are
Lucide's, because that is what those files already say; renaming them in
the same change would have made it unreviewable.

### Superseded: fully round controls

Buttons and inputs were fully round — text actions as pills, icon actions
as circles — on an explicit request. They are 8px rectangles now. A pill
is the one shape the reference never draws, and a round button beside a
12px card is the clearest sign the two were not designed together. The
earlier decision is recorded here rather than deleted, because it was a
real decision and this supersedes it rather than correcting it.

### §4.1, the brand accent

The founder's brief (September 2026) asks for a primary colour used as the
accent, consistently, at an Apple pitch. The earlier language kept every
button monochrome and banned coloured links. So `--accent` is now the one hue
chrome carries, with the meaning and the closed list of uses in section 4.1
above. Inverse ink fills moved to `--surface-inverse` so the accent stays
scarce. Recorded in `docs/DESIGN_LANGUAGE.md` §4.1 and §4.2.

### §4.4, the headline chart series shares the agent hue

`--series-1` is the reference's violet, and so is the `agent` signal. A series
and an agent mark never sit on the same surface, and both mean a machine
produced the number, so the overlap is a rhyme rather than a collision.
Argued in `docs/DESIGN_LANGUAGE.md` §4.4.

### Rule 20, the word "Elevate", operations kind registry

`lib/kinds/operations.ts` has a field literally named `elevate`, labelled
"Elevate". Rule 20 bans the word on sight because of how marketing copy uses
it. This is not that use: Elevate is the fourth of the five focusing steps in
the Theory of Constraints. Renaming it would leave the template asking for
something the method does not have a word for.

### Rule 11, the revision rail

The design language specifies a rail of commit nodes down the left edge of
anything with history. Rule 11 bans left-border accent treatments. The rail
is not an accent: it carries the commit markers, and each node is a target
that addresses a revision. Decorative left borders remain banned, including
on blockquotes, cards, alerts and active navigation items.

### Rule 6 and rule 19, the marketing surface

Both were open violations and are now closed rather than excepted: the
logged-out site renders both themes from the same tokens as the product and
follows the viewer's theme the way the app does (the forced light theme was
removed in September 2026), `app/marketing.css` scopes only what a marketing
page adds, and it is a multi-page site with its own metadata per route. The
site's buttons are the product's `Button`, its cards carry the product's
radius, and the chamfered corner, the ruled-paper hero ground and the corner
registration marks that used to mark the surface as different are gone: the
public face and the instrument are one design.

### Rule 18 and §4.8, the ForgeUI blocks

The marketing site began from licensed ForgeUI Pro blocks. Every block that
ships was rewritten onto the token system in `components/marketing/**`,
where every rule applies in full, and the vendored originals were removed in
September 2026 once nothing referenced them: a directory excluded from lint
and typechecking is a place a rule can hide. The ForgeUI registry entry in
`components.json` remains so a new block can be pulled and rewritten the same
way.

### Rule 15, the illustrations move

The marketing illustrations animate continuously and loop. Rule 15 bans
motion that reveals content as the viewport reaches it, and none of these do:
every scene is fully drawn on first paint. What moves is the mechanism the
scene explains. Under `prefers-reduced-motion` each scene holds its final
state.

### Rule 12, three marketing spacing steps

The product's 4pt scale tops out at 64px. A marketing page needs more air
between sections than a data table needs between rows, so `.company-marketing`
adds exactly three steps, 80, 112 and 128, each a multiple of 16, as
`--mk-section` across the three breakpoints. Nothing else on the surface is
off the scale.

---

### September 2026, companyos identity

The founder approved an interlocking bracket symbol and the lowercase
`companyos` wordmark, then authorized integration and merge to main. The
brackets replace the earlier commit-node brand mark across the site, auth,
and app shell. Revision-history commit nodes retain their functional meaning.
The shared `Mark` uses currentColor; the `t-brand` role uses regular-weight
Geist Sans at 20/24px with -0.045em tracking, confined to logo lettering.
This preserves the supplied reference's restrained grotesk aesthetic without
introducing a new interface font. The raster logo studies are retained in
`public/brand`; the application uses crisp vector geometry and live type.

Rules 1 and 4: the founder explicitly requested the supplied reference's
iridescent glass material for the standalone social image. That artwork is
permitted in `app/opengraph-image.png` and the footer's isolated
`public/brand/companyos-icon-glass.png`; it is not a gradient palette or
glass panel treatment for the interface. All remaining application branding remains
monochrome and uses the existing theme ink tokens.

The founder also requested centered homepage hero copy, a taller dashboard
preview, and removal of the nested frame. The preview is now 1040 by 600px
and retains only its own application-window edge. Center alignment is confined
to the hero introduction; document content and body sections stay left-aligned.

The header wordmark blurs and collapses into the icon when its existing scroll
sentinel leaves view. This explicit founder-requested Motion transition lasts
260ms and reverses at the top. It changes persistent header identity, not the
visibility of page content, so it is not a scroll reveal. The blur affects only
the departing wordmark text, not a surface background. Reduced motion uses an
immediate switch without blur, and the link retains its accessible home label.

### September 2026, borderless onboarding and round actions

The founder explicitly requested a borderless OAuth onboarding screen, the
updated companyos logo from `codex/companyos-brand-identity`, Motion step
transitions, and fully round buttons application wide. The consent route may
place its short form directly on the canvas (an exception to surface rule
2.3); spacing separates the decisions. Shared Button and IconButton primitives
use pill and circular shapes. Text links keep their inline geometry.
Step transitions use Motion with a short 8px movement and opacity change;
reduced motion removes movement and delay. This is feedback to navigation,
never a scroll reveal. The logo component and its dedicated `t-brand` role
come directly from the approved identity merged in `8455b6a`.

### September 2026, task-focused workspace override

The user explicitly requested a full override of the crowded homepage. The original Atlas rule requiring every reading to occupy full-width ruled sections is superseded on Home: one attention surface and open lists express task priority, while the original analytical instruments remain under Company record. The home measure is 1120px with 48px desktop margins, rather than the generic bleed measure. This reduces competing information without removing access to it.

Lucide icons remain for established navigation and actions so the redesigned shell does not introduce a competing symbol vocabulary. Homepage content does not lead with decorative icon tiles. Imported component colors and typography are mapped to Company OS semantic tokens. No new default library palette is introduced.

## 11. Open violations

These are known and unfixed. They are not exceptions: an exception is a rule
this project has decided not to follow, and these are rules it has not caught
up with yet. A surface on this list does not ship as "done".

None open. The last render and axe pass (every product surface and every
site page at 375 and 1440 in both themes, September 2026) found nothing on
the list.

### September 2026, product-grounded marketing

The founder asked to retain the page layout while replacing confusing feature
copy and missing logos. Marketing now explains a company workspace first and
follows a customer profile through writing, revision and use by an assistant.
The founder explicitly confirmed the current layout and asked for the paid
ForgeUI animations back inside it. Existing feature slots now render those
licensed scenes, paired with the capability each depicts. Readable captions
remain outside the scaled artwork, and scenes are labeled as examples. The
page order, copy, grids and feature-row arrangement remain unchanged.
Claude, Cursor and MCP marks identify compatible client categories, not customer
endorsements. Native app icons and supplied partner logos identify linked store
listings, including their availability state. The hero animation, compact logo
transition and glass footer mark retain their existing approved behavior.

### September 2026, requested ASCII ripple behind the homepage hero

The founder explicitly selected React Bits ASCII Ripple for the logged-out
homepage. This overrides the general no-decoration direction for this bounded
background only. Its words describe company context; its monochrome ink and
monospace type come from existing tokens. A mask preserves the central reading
column. Pointer input disturbs the background without intercepting links or
native touch scrolling. There is no automatic rain, and reduced motion keeps
the text still. The canvas simulation stops when idle, hidden or out of view.

### September 2026, explicitly requested post-login welcome

The founder requested a 2–3 second Particle Morph logo, the exact Staggered
Text character/blur treatment on a personalized welcome, an upward Motion
wipe and a quicker full-screen catch-up view. This narrowly overrides the
usual no-intro-motion and typography defaults: the supplied 60px bold tightly
tracked text stays on one line at every width, scaling down to fit the actual
name and available space without truncating it. The intro runs only after successful
login, has Skip and Escape paths, and reduced motion opens the static summary.
The summary reads the existing inbox and makes no fabricated last-visit claim.
The user-selected React Bits implementations own their internal effects;
Motion owns only the full-screen handoff. Controls keep the product primitives.
