# Shopify admin — measured reference

Company OS's application surfaces are rebuilt on Shopify admin's design
language. This file is the working: every number read off a reference, where it
was read, and what it becomes at the width we build to.

**Nothing here is estimated.** A row appears once it has been measured. Rows
still to measure are listed at the bottom by name so the gap is visible rather
than filled in with a guess.

## The references

Pulled from Mobbin with `search_screens` (platform `web`, app Shopify) and
stored under `.refs/shopify/` (gitignored — they are Mobbin's, not ours).

| file | surface it anchors |
|---|---|
| `home.webp`, `home-sales-breakdown.webp` | dashboard home, metric row, task cards |
| `analytics*.webp` (6) | card grid, section editing, drag handles, card menus |
| `index-products.webp`, `index-products-search.webp` | index table, filter tabs, search |
| `index-orders.webp`, `index-orders-columns.webp`, `index-orders-bulk.webp` | column picker, bulk-select bar, sort menu |
| `index-billpay-tabs.webp` | sub-page header with back link and tab row |
| `form-company-cards.webp`, `form-add-menu.webp` | stacked form cards, sticky save bar |
| `settings-*.webp` (8) | settings overlay, its own nav + search, permission trees, banners |
| `product-new`, `product-detail`, `product-variants-metafields`, `product-inventory-*`, `product-description-focus` | two-column detail page, inline editor, inventory table, adjust popover |
| `order-fulfilled`, `order-unfulfilled`, `order-on-hold`, `order-partially-refunded`, `order-fulfillment-split`, `order-timeline`, `order-created-toast`, `order-more-actions-menu` | detail chrome, status badges, fulfilment cards, timeline, toast |
| `customer-detail`, `customer-timeline`, `customer-new-empty`, `customer-new-filled` | metric header row, right-rail cards, a form with a live save bar |
| `empty-*.webp` (8) | empty state: card, illustration, heading, actions, the link below |
| `modal-*.webp` (7) | both modal widths, header bars, pickers, footers |
| `filter-*.webp` (5) | view tabs, add-filter menu, value popover, sort menu, column visibility |
| `discount-*`, `index-discounts*` | create form, right-rail summary, success banner, created toast |
| `analytics-*.webp` (5 new) | report detail, query editor, annotation rail, controls rail |
| `guide-*.webp` (6), `onboarding-*.webp` (2) | setup guide, its side drawer, completion, first-run |
| `alerts-popover`, `assistant-side-panel`, `assistant-conversation-search` | top-bar popovers and the side panel |
| `daterange-picker` | two-month calendar, preset list, Cancel/Apply |
| `auth-verify-code`, `auth-verify-password` | the logged-out card on black |

One hundred references, not the twenty the first pass worked from. Several of
the numbers below only became visible with the wider set: a modal's width is
invisible until two modals of different sizes can be compared, and the
detail-page column split cannot be read off an index page at all.

Every reference is **1920×1325**, of which the bottom ~117px is Mobbin's own
footer band, so the screen itself is 1920×1208. That is a **1512px render
upscaled by 1.2698**, so a reading at 1920 divides by 1.27 to reach the width
we build at — the same relationship the Sana references had.

## Chrome — measured

| element | @1920 | @1512 | read from |
|---|---|---|---|
| Top bar height | 71 | **56** | `index-orders`, the body's top edge at x=12 |
| Top bar fill | — | `#0a0a0a` | `index-products` col x=300, y=0–69 |
| Search field | 814 × 46 | **640 × 36** | `home` row y=36; centre 755.6 against a viewport centre of 756.0, so it is exactly centred |
| Search field fill | — | `#282828` | `home` col x=600 |
| Body top-left radius | 12 | **10** | `index-orders`, the arc from (12, y71) to (x0, y83) |
| Rail width | 304 | **240** | agrees on five references at y=640 and y=900 |
| Rail fill | — | `#ebebeb` | `index-products` col x=300 |
| Pane fill | — | `#f1f1f1` | right of the rail, away from cards |
| Card fill | — | `#ffffff` | inside the table card |
| Card border | — | `#e2e2e2` | `index-products` col x=1750, y=141 |
| Card bottom edge | — | `#cdcdcd` | same column, y=513 — a darker line than the other three sides |
| Card radius | 14 | **12** | top-left arc, `index-products` x 320–342 |
| Pane padding | 21 | **16** | card left edge 325 against a rail edge of 304 |

### Rail

| element | @1920 | @1512 | read from |
|---|---|---|---|
| Nav row pitch | 35.5 | **28** | 16 consecutive ink-band centres, `index-products` |
| Selected pill | 265 × 36 | **209 × 28** | `index-products` y=165, x 13–277 |
| Selected pill fill | — | `#fafafa` | same |
| Pill left inset | 13 | **10** | same |
| Pill right inset | 27 | **22** | same — the rail's gutters are ASYMMETRIC |
| Icon ink | 15 × 16 | **12 × 13** | Home and Orders icons; drawn inside a 16px box |
| Icon left | 28 | **22** | so 12px of padding inside the pill |
| Label left | 60 | **47** | 8px clear of the icon box |
| Nav label | cap 12 | **13px** | cap height 9.5 at 1512, ÷0.72 |

### Index page

| element | @1920 | @1512 | read from |
|---|---|---|---|
| Page title | cap 17 | **20px / 600** | `index-products` "Products", cap 13.4 at 1512 |
| Header button height | 35 | **28** | `index-products` col x=1880 through "Add product" |
| Header button label | cap 11 | **12px** | "Export" |
| Card filter row | 56 | **44** | col x=1750, card top 142 to the hairline at 198 |
| Filter row: view label | — | **18 from the card edge** | `index-products` ink clusters, y 150–192 |
| Filter row: view caret | — | **43** | same |
| Filter row: search mark | — | **68** | same |
| Filter row: trailing icon | — | **16 from the right edge** | same |
| Filter row rule | — | `#ebebeb` | col x=1750, y=198 |
| Table header row | 45 | **35** | hairline 198 to hairline 244, fill `#f7f7f7` |
| Table header label | cap 11 | **12px** | "Product" |
| Table body row | 67 | **53** | four consecutive hairlines: 245, 311, 378, 446, 513 |
| Row thumbnail | 39 | **32** | row 1, x 384–422 |
| Cell text | asc 12 | **13px** | "50 in stock", ascender 9.5 at 1512, ÷0.73 |
| Status badge | 66 × 25 | **52 × 20** | "Active" |

### Form page

| element | @1920 | @1512 | read from |
|---|---|---|---|
| Card column width | 804 | **633 ≈ 640** | `form-company-cards` row y=230, x 712–1515 |
| Column position | — | centred **in the pane** | centre 876 against a pane centre of 876, not the viewport's 756 |
| Card gap | 17 | **13 ≈ 12** | col x=1450, card edges 295 and 312 |
| Card heading | ink 17 | **14px / 600** | "Catalogs", cap-to-descender 13.4 at 1512, ÷0.93 |
| Field label | — | **13px** | "Ship to address" |

## How these were read

Naive edge-walking produced nonsense on these images twice — a top bar of 12px,
a rail of 59px — because it hit the search field, a nav pill, or a row of text
and stopped there. And the first pass at this file recorded a rail of 320 and a
table row pitch of 42; both were wrong, and both are corrected above. Three
things fixed it:

1. **Probe a column or row with nothing in it**, and confirm the same answer
   from two different ones. The rail reads 304 at y=640 and y=900 on five
   separate references; at y=160 it reads 15, because that row crosses a nav
   label.
2. **Dump colour runs and read them**, rather than trusting a first-change
   scan. `runs()` over a strip prints every band with its length and colour, so
   a wrong answer is visible instead of silent.
3. **Divide ink height by the right ratio.** Cap height is 0.72em, an ascender
   0.73em, cap-to-descender 0.93em. Using the wrong one moves a type size by
   30%, which is how "Catalogs" first read as a 19px heading when it is 14.

This is the same failure the Cadre rules describe: a measurement window that
clips returns a smaller number with no sign anything went wrong.

## The rail's gutters are asymmetric, and that is not an accident

The reference insets its nav rows 10 from the left of the rail and 22 from
the right. The first pass here recorded that, decided it looked like a
reserved scrollbar gutter, squared it up at 12 both sides, and wrote the
difference off as "recorded and not copied".

That was wrong, and it was visible: with 12 on the right, a nav row's
trailing count or chevron ends 28px from the first card on the page, and
the rail and the pane read as one continuous column with the content
jammed against the navigation. With the reference's inset there are 36px
between them — 20 of rail plus the pane's own 16 — and the two separate.

Built: 12 left, 20 right (22 is not on the spacing scale; 20 and 24 are
equidistant from it and 20 keeps the pill nearer the measured width). The
pill measures 12 → 220 against the reference's 10 → 218.

The lesson is the one this file keeps relearning: when a measurement looks
like an artifact, the measurement is usually still right, and the reason
it looks like an artifact is that the reason for it has not been found
yet.

### Detail page — two columns

Read from `order-fulfilled` at y=440 and y=345, confirmed against
`order-unfulfilled` and `customer-detail`. Card borders, not fills, give the
edges: at tolerance 1 the main card's right border is `#e3e3e3` at x=1325 and
the aside's left border is `#e2e2e2` at x=1349, every time.

| element | @1920 | @1512 |
|---|---|---|
| Content block | 1222 | **962** |
| Main column | 828 | **652** |
| Gap | 23 | **18** |
| Aside column | 371 | **292** |

The block is not quite centred in the pane: 193 to its left, 200 to its
right. That is the same ~7px reserved scrollbar gutter the rail has, and the
same reason.

An index page and a single-column form are **640**, measured earlier. A
two-column detail page is 962. They are different layouts, not one layout
measured twice.

### Modals

| element | @1920 | @1512 |
|---|---|---|
| Small modal width | 788 | **620** |
| Large modal width | 1116 | **880** |
| Header band | 65 | **52**, fill `#f3f3f3` |

Both widths centre at x=959.5, which is **755.6 @1512** — the same centre as
the top bar's search field. That is the check that the reading is right: two
unrelated elements measured on different screens land on the same axis.

A small modal carries `Cancel` and its primary action in a footer. A large one
carries `Discard` and `Save` in its header band instead, and its body scrolls.

### Toast

| element | @1920 | @1512 |
|---|---|---|
| Height | 55 | **44** |
| Width ("Marked as fulfilled ×") | 208 | **164** |
| Fill | | `#1a1a1a` |

Content-width, centred on the pane's own centre (755.6), sitting above the
bottom of the content area rather than the viewport.

### Settings overlay

Measured on `settings-general`, confirmed on `settings-plan`. It is **not** a
dark-backdrop dialog: the scrim is `#f1f1f1`, the same grey as a pane.

| element | @1920 | @1512 |
|---|---|---|
| Nav column | 365 | **288** |
| Gap | 28 | **22** |
| Detail panel | 908 | **715** |
| Total | 1306 | **1028** |

### Rail sub-items

`Orders` opens `Drafts`, `Shipping labels`, `Abandoned checkouts` beneath it.
A sub-item has **no icon** and its label's left edge sits at x=63 @1920 —
the same x as a parent row's *label*, not indented past it. Row pitch drops
from the parent's 28 to **24**.

## Still to measure

- Bulk-select bar: height, fill, button sizes
- Sticky save bar: height, fill, button placement
- Analytics card grid: column count, card height, chart inset
- Date-range picker: calendar cell size, preset column width
- Status badge: pill height, dot size, the fill per status
- Motion: what animates on open/close, and over how long

## The rig

`.refs/measure.mjs` reports **runs** of constant colour along a row or a
column; `.refs/box.mjs` reports the bounding box of the pixels satisfying a
predicate. A run, not a first-change scan, because a scan reports the first
boundary and hides everything past it — which is how a 22px inset was once
read as 10. A box, not a scan, for anything boxed: a scan reports one row's
edges and a modal's width is the widest row's.
