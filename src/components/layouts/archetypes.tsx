import type { ReactNode } from "react";
import { X } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The four layout archetypes: grid, container and gutters, and nothing else.
 *
 * §10.1 makes ad-hoc page-level grid CSS a review failure, and §6.3 gives the
 * measure to the shell: today eleven pages declare six different
 * `mx-auto max-w-*` values inside a `<main>` that is already offset by the
 * sidebar, so the text column visibly jumps left and right on every
 * navigation. Everything here is deliberately typography-free, card-free and
 * header-free — a layout that also draws a heading is a layout two pages will
 * fight over.
 *
 *   PageShell     every route. Owns the one measure and the page gutters.
 *   SplitLayout   main content + a subordinate 320px summary rail.
 *   MasterDetail  A13 MISSION INSPECTOR: a bounded, scrolling primary list
 *                 beside a detail pane that fills.
 *   FocusRoute    A9 GENESIS SHEET and A16 COMPOSER: the shell suppressed.
 *
 * This module carries no "use client" on purpose. Nothing here holds state or
 * touches a browser API — FocusRoute only forwards the `onClose` its (client)
 * caller hands it — so PageShell stays renderable inside a Server Component
 * and does not drag eleven pages into the client bundle.
 */

/**
 * Page gutters. Measured: the reference insets its content 16px from the
 * rail and 16px from the right edge at 1512, and the gutter does not change
 * with width — a dense admin keeps one inset and lets the content grow. So
 * there is no responsive tier here at all, which is also why 16 has to hold
 * at 375, where it is anti-slop rule 12's floor.
 * Vertical padding mirrors it: if the shell does not own the page's top
 * inset too, every page re-declares `py-*` and the drift this component
 * exists to end simply reappears on the other axis.
 */
const PAGE_GUTTER = "px-6 py-6";

export type PageMeasure = "prose" | "page" | "bleed";

/** §6.3 — exactly three container modes. There is no fourth. */
const MEASURE: Record<PageMeasure, string> = {
  prose: "max-w-[var(--prose-max)]",
  page: "max-w-[var(--page-max)]",
  bleed: "max-w-none",
};

export interface PageShellProps {
  /** `prose` 720px · `page` 1440px (default) · `bleed` full width. */
  measure?: PageMeasure;
  /**
   * No gutters at all: the page is a stack of full-width sections divided by
   * rules, each carrying its own inset. The reference dashboard's shape, and
   * the one the company overview takes.
   */
  flush?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * The one measure. Every route's content begins here and **no page may
 * declare its own `mx-auto max-w-*`** (§13.4/30).
 *
 * The tree is the same shape in all three modes — gutter box outside, measure
 * box inside — so a page's `> *` spacing and a sticky child behave identically
 * whichever measure it asked for.
 *
 * Zero-data: a shell with no children still renders its gutter box, which is
 * what keeps an empty route the same width as a full one instead of collapsing
 * to nothing behind a centred message.
 */
export function PageShell({
  measure = "page",
  flush = false,
  children,
  className,
}: PageShellProps): ReactNode {
  return (
    <div className={cn("w-full", flush ? "" : PAGE_GUTTER, className)}>
      <div className={cn("mx-auto w-full", MEASURE[measure])}>{children}</div>
    </div>
  );
}

export interface SplitLayoutProps {
  main: ReactNode;
  rail: ReactNode;
  /** Which side the rail takes at ≥1024px. Default `right`. */
  railSide?: "left" | "right";
  className?: string;
}

/**
 * Main content beside a subordinate summary rail (§6.3: `--rail-w` 320px,
 * min 280, max 360). The rail is a *readout* — right-rail summary cards, a
 * facet column, an issue-key form — never the primary axis; when the primary
 * axis is a list, use MasterDetail instead.
 *
 * Below 1024px the rail drops beneath the main content in both `railSide`
 * modes: the DOM order is always main-then-rail, and `order` only applies at
 * `lg`, so the reading order on a phone is content first and summary second.
 *
 * The track is clamped rather than fixed so that a page overriding `--rail-w`
 * on a wrapper still lands inside the band the spec permits.
 *
 * Zero-data: an empty rail renders as an empty column and the main content
 * keeps its width — the grid never reflows to one column because a rail
 * happens to have nothing in it, which would move the whole page sideways the
 * moment the first summary value arrives.
 */
export function SplitLayout({
  main,
  rail,
  railSide = "right",
  className,
}: SplitLayoutProps): ReactNode {
  return (
    <div
      className={cn(
        // 24px gutter — the layout grid's column gutter (§6.3).
        "grid grid-cols-1 gap-8 lg:items-start",
        railSide === "left"
          ? "lg:grid-cols-[clamp(280px,var(--rail-w),360px)_minmax(0,1fr)]"
          : "lg:grid-cols-[minmax(0,1fr)_clamp(280px,var(--rail-w),360px)]",
        className,
      )}
    >
      {/* min-w-0 on both cells: without it a wide table or a long hash inside
          either column blows the track out past the page gutter. */}
      <div className="min-w-0">{main}</div>
      <div className={cn("min-w-0", railSide === "left" && "lg:order-first")}>
        {rail}
      </div>
    </div>
  );
}

export interface MasterDetailProps {
  list: ReactNode;
  detail: ReactNode;
  className?: string;
}

/**
 * A13 MISSION INSPECTOR's silhouette: a bounded, independently scrolling list
 * column beside a detail pane that fills.
 *
 * This is deliberately **not** SplitLayout. There the rail is a subordinate
 * summary pinned at a fixed 320px; here the list is the primary axis — it is
 * comparably wide, it owns its own scroll, and it stays put while the detail
 * beside it scrolls, because the whole point of the archetype is cross-run
 * comparison against one selected run.
 *
 * Below 1024px the list collapses to full width and the detail stacks beneath
 * it. The list keeps a viewport-relative bound there too: an unbounded list on
 * a phone puts the detail pane hundreds of rows below the fold, which is the
 * same as not shipping it.
 *
 * The sticky offset is `--header-h` plus 16px, both on the 4pt scale, so the
 * list clears the sticky top bar rather than butting against it.
 *
 * Zero-data: both panes render at their full geometry. An empty list column is
 * still a column — its EmptyState (§11.3) sits inside the bounded box at the
 * width the rows will have, so nothing moves when the first row lands.
 */
export function MasterDetail({
  list,
  detail,
  className,
}: MasterDetailProps): ReactNode {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-8 lg:grid-cols-[minmax(320px,44%)_minmax(0,1fr)] lg:items-start",
        className,
      )}
    >
      <div
        className={cn(
          "min-w-0 max-h-[60dvh] overflow-y-auto overscroll-contain",
          "lg:sticky lg:top-[calc(var(--header-h)+16px)] lg:max-h-[calc(100dvh-var(--header-h)-32px)]",
        )}
      >
        {list}
      </div>
      <div className="min-w-0">{detail}</div>
    </div>
  );
}

export interface FocusRouteProps {
  title: ReactNode;
  /**
   * Supplied by the page, which owns the destination — this component renders
   * the affordance only, so the route stays back-button-safe. With no handler
   * the slot stays empty and the bar keeps its geometry.
   */
  onClose?: () => void;
  /** 0..1. Values outside the range are clamped rather than overflowing. */
  progress?: number;
  /** The step counter, e.g. `3 / 9`. */
  step?: ReactNode;
  children: ReactNode;
}

/**
 * The full-viewport focus route used by A9 GENESIS SHEET and A16 COMPOSER —
 * the two moments where the ledger does not exist yet, and therefore the two
 * routes that suppress the app shell entirely (§10.1).
 *
 * A 52px bar: close × left, `title-compact` centre, step counter right, with a
 * 2px progress meter welded to its top edge. The bar is a three-track grid
 * (`1fr auto 1fr`) so the title is optically centred whatever the counter says
 * and whether or not a close affordance is rendered.
 *
 * It imposes no measure on its content: A9 wants a 640px column and A16 a
 * two-pane full-viewport workspace, so the column is the archetype's to draw.
 *
 * The bar title is not a heading — the content below owns the page's `h1`
 * (A9's kind identity, A16's interview), and a second `h1` in the chrome would
 * break the outline (§12.6).
 *
 * Zero-data: with no `progress` the meter still draws its empty track. Chrome
 * that describes the shape of absent data must render (§11.2) — an empty gauge
 * is a gauge — and at exactly 0 the fill shows the hairline left stub the
 * Meter contract requires, never a sliver of ink and never nothing.
 */
export function FocusRoute({
  title,
  onClose,
  progress,
  step,
  children,
}: FocusRouteProps): ReactNode {
  // A NaN or an out-of-range value must not become an overflowing bar: clamp
  // it, and treat "no number" as unmeasured rather than as zero progress.
  const raw =
    typeof progress === "number" && Number.isFinite(progress) ? progress : null;
  const measured = raw !== null;
  const pct = Math.round(Math.min(1, Math.max(0, raw ?? 0)) * 100);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {/* Sticky, z-10 — the sticky-header rung of the ladder (§5.9). */}
      <header className="sticky top-0 z-10 h-[var(--header-h)] shrink-0 border-b border-border bg-rail">
        <div
          className="absolute inset-x-0 top-0 h-1 bg-track"
          role={measured ? "progressbar" : undefined}
          aria-label={measured ? "Completion" : undefined}
          aria-valuemin={measured ? 0 : undefined}
          aria-valuemax={measured ? 100 : undefined}
          aria-valuenow={measured ? pct : undefined}
          aria-hidden={measured ? undefined : true}
        >
          {/* Neutral progress fills monochrome (§4.6/7) — this meter encodes
              no threshold, so it carries no hue. `min-w-1` keeps the 2px stub
              visible at zero. */}
          <div
            className={cn(
              "h-full min-w-1 transition-[width] duration-[var(--dur-3)] ease-[var(--ease-out)]",
              pct === 0 ? "bg-hairline" : "bg-ink",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* `1fr auto 1fr`: the title sits in the auto track and is therefore
            exactly centred whatever the side slots hold. Only the title cell
            takes `min-w-0` — the auto track resolves before the fr tracks, so
            zeroing the side minimums too would let a long title crush the
            close button to nothing instead of truncating itself. */}
        <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-5 px-5 sm:px-6">
          <div className="flex items-center justify-start">
            {onClose ? (
              <IconButton label="Close" size="md" onClick={onClose}>
                <X />
              </IconButton>
            ) : null}
          </div>
          <div className="t-title-compact min-w-0 truncate text-center text-ink">
            {title}
          </div>
          <div className="flex items-center justify-end">
            {step ? (
              <span className="t-micro tabular truncate text-ink-3">
                {step}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
