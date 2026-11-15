"use client";

import { Select } from "@/components/ui/select";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Search,
  type LucideIcon,
} from "@/components/ui/icon";
import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react";
import { IconButton } from "@/components/ui/button";
import { cn, NO_VALUE } from "@/lib/utils";

/**
 * LEDGER INSTRUMENT — the data table (§9.8, §6.4).
 *
 * Density is earned, never assumed: a row here is dense because every column is
 * typed and icon-marked — the ForgeUI move that makes a row scannable by shape
 * before it is read — not because the padding was shrunk.
 *
 * This module is a client boundary because `TH` owns a sort handler; the density
 * context rides along on that, which is what lets a cell decide whether its
 * second line is on screen or in a tooltip without every call site threading a
 * prop through four components.
 */

/** §6.4: two tiers, and there is no third. */
export type Density = "comfortable" | "compact";

const DensityContext = createContext<Density>("comfortable");

export interface DataTableProps extends ComponentProps<"div"> {
  density?: Density;
  /**
   * A full-bleed section rather than a bordered object: no outer border, no
   * radius. For the reference's stacked page, where sections are divided by
   * full-width rules instead of boxed.
   */
  flush?: boolean;
}

/**
 * The container (§9.8): a raised object at `--r-14` that clips its own header
 * and footer. `overflow-hidden` is what makes the first header row and the last
 * footer row take the container's corners while keeping their own at `--r-0`
 * (§5.4).
 *
 * Zero-data rendering: the container always draws. The frame describes the
 * shape of the absent data — an empty table is still a table, and the header
 * row is retained so column meaning survives (§11.2). The page supplies the
 * empty body as one full-span 240px cell and hides the footer.
 */
export function DataTable({
  className,
  density = "comfortable",
  flush = false,
  children,
  ...props
}: DataTableProps): ReactNode {
  return (
    <DensityContext.Provider value={density}>
      <div
        data-density={density}
        className={cn(
          // The reference's table: a bordered object on the page ground with
          // no shadow, or a bare section when flush.
          "overflow-hidden bg-raised",
          !flush && "rounded-12 border border-border",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </DensityContext.Provider>
  );
}

export interface TableFiltersProps {
  /**
   * The saved-view picker. The reference puts one word and a caret here —
   * "All" — and everything else the page wants to filter by goes behind it.
   */
  view?: ReactNode;
  /** Opens the view picker. Omit and the view reads as a label. */
  onOpenViews?: () => void;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  /** Trailing controls, after a hairline: column picker, density, export. */
  actions?: ReactNode;
  className?: string;
}

/**
 * The filter row: the 44px strip at the top of an index card, above the
 * header row and inside the card's own border.
 *
 * Measured off `index-products` at 1512, relative to the card's left edge:
 * the view label starts at 18, its caret at 43, the search magnifier at 68
 * and the field runs from there to the trailing cluster, which sits 16 in
 * from the right edge behind a hairline. The row is 44 tall with a
 * `#ebebeb` rule under it.
 *
 * This is the piece the product did not have. Filter chips floated ABOVE
 * the card as a row of pills, with a density toggle opposite them — so the
 * controls for a table lived outside the object they controlled, and the
 * card began at its header row. Putting them inside is most of why an index
 * page reads as the reference's: the card becomes the whole surface, and
 * the page above it is only a title and its actions.
 */
export function TableFilters({
  view,
  onOpenViews,
  value,
  onValueChange,
  placeholder = "Search and filter",
  actions,
  className,
}: TableFiltersProps): ReactNode {
  return (
    <div
      className={cn(
        "flex h-[44px] shrink-0 items-center gap-5 border-b border-hairline px-5",
        className,
      )}
    >
      {view ? (
        onOpenViews ? (
          <button
            type="button"
            onClick={onOpenViews}
            className="focus-ring-inset -mx-2 flex shrink-0 items-center gap-2 rounded-8 px-2 py-1 t-body-strong text-ink outline-none transition-colors duration-[var(--dur-1)] hover:bg-state-hover"
          >
            {view}
            <ChevronsUpDown aria-hidden="true" className="size-[13px] text-ink-3" />
          </button>
        ) : (
          <span className="t-body-strong shrink-0 text-ink">{view}</span>
        )
      ) : null}

      {/* The field is only drawn when the page can actually search. The
          reference always shows one because every one of its indexes is
          searchable; drawing an inert one here would be a control that
          looks like it works. */}
      {onValueChange ? (
        <label className="flex min-w-0 flex-1 items-center gap-4">
          <Search aria-hidden="true" className="size-[16px] shrink-0 text-ink-3" />
          <span className="sr-only">{placeholder}</span>
          <input
            type="search"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder={placeholder}
            // No box: the row IS the field. A bordered input inside a 44px
            // strip inside a card is three edges deep and the reference
            // draws none of them.
            className="t-body min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-3"
          />
        </label>
      ) : (
        <span className="min-w-0 flex-1" />
      )}

      {actions ? (
        <div className="flex shrink-0 items-center gap-2">
          <span aria-hidden="true" className="h-[20px] w-px bg-hairline" />
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The line under an index card — "Learn more about products" in the
 * reference. Centred, 12px, and a link rather than a button: it leaves.
 */
export function TableFootnote({
  className,
  ...props
}: ComponentProps<"p">): ReactNode {
  return (
    <p
      className={cn("t-caption mt-6 text-center text-ink-3", className)}
      {...props}
    />
  );
}

/**
 * The table itself, inside its own horizontal scrollport (§12.7): wide content
 * scrolls in its container and the page body never scrolls sideways.
 *
 * That scrollport is also what the sticky header sticks to, so a page that wants
 * a pinned header gives the container a height (`max-h-…`) rather than relying
 * on page scroll — a nested scroll container cannot delegate vertical stickiness
 * back to the document.
 */
export function Table({
  className,
  ...props
}: ComponentProps<"table">): ReactNode {
  return (
    <div
      // A table wider than its column scrolls sideways, and a scroll region
      // a keyboard cannot reach is a table a keyboard cannot read. One tab
      // stop, with the inset ring so the stop is visible.
      tabIndex={0}
      role="group"
      aria-label="Scrolls sideways"
      className="focus-ring-inset w-full overflow-x-auto outline-none"
    >
      <table
        className={cn("w-full border-collapse text-left", className)}
        {...props}
      />
    </div>
  );
}

/**
 * `THead` and `TBody` are unstyled seams: the row and cell primitives carry the
 * geometry, and the section elements exist so `TR` can tell which of the two it
 * is in without a prop.
 *
 * Zero-data rendering: a body with no rows renders no rows. The empty block is
 * a full-span 240px cell the page supplies, because only the page knows the
 * column count and which of the five empty variants it is in (§11.3) — and the
 * header above it stays exactly as it is, so the columns still say what the
 * missing rows would have meant.
 */
export function THead({
  className,
  ...props
}: ComponentProps<"thead">): ReactNode {
  return <thead className={cn(className)} {...props} />;
}

export function TBody({
  className,
  ...props
}: ComponentProps<"tbody">): ReactNode {
  return <tbody className={cn(className)} {...props} />;
}

export interface TRProps extends ComponentProps<"tr"> {
  /** `--state-selected` plus a 2px full-height ink bar on the leading edge. */
  selected?: boolean;
  /** Uncommitted changes: a 2px `--caution-mark` bar on the leading edge. */
  dirty?: boolean;
  /** Archived or out of scope: every text tier drops one rung. */
  disabled?: boolean;
}

/**
 * A row (§9.8). Body rows are 44px single-line and 56px two-line — 36 / 40 in
 * compact — and the row height is what produces the §6.4 cell padding rather
 * than the other way round: 44px around a 20px line box IS 12px of padding, and
 * 36px around it is 8px. The cells carry only a small guard padding so a wrapped
 * value can never touch the hairline.
 *
 * Two-line-ness is detected from the content with `:has()`, so a page never has
 * to declare it and can never get it wrong. Without `:has()` the guard padding
 * still lands the row within 2px of spec.
 *
 * The section-scoped `[tbody_&]` prefix keeps every body treatment off the
 * header row, which owns its own geometry.
 *
 * Hover changes BACKGROUND ONLY (§5.7, §7.3): no transform, no border change,
 * no elevation. Rows in a dense ledger must not move under the cursor.
 */
export function TR({
  className,
  selected,
  dirty,
  disabled,
  ...props
}: TRProps): ReactNode {
  return (
    <tr
      data-selected={selected ? "" : undefined}
      className={cn(
        // Measured: four consecutive hairlines 67 apart at 1920, so 53.
        "[tbody_&]:h-[53px] [tbody_&]:has-[[data-cell-stack]]:h-[64px]",
        "[[data-density=compact]_tbody_&]:h-[40px] [[data-density=compact]_tbody_&]:has-[[data-cell-stack]]:h-[48px]",
        "[tbody_&]:border-b [tbody_&]:border-hairline [tbody_&]:last:border-b-0",
        "[tbody_&]:transition-colors [tbody_&]:duration-[var(--dur-1)] [tbody_&]:ease-linear",
        "[tbody_&]:hover:bg-state-hover",
        // Rows are focusable and traversable (§12.4). The ring is inset because
        // an outset one would be clipped by the container's own overflow.
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
        // The leading bar is drawn as an inset shadow on the first cell: a
        // `box-shadow` on a `<tr>` is not reliably painted in a collapsed table,
        // and a border would be a fourth line weight (§2.5).
        selected &&
          "bg-state-selected [&>*:first-child]:shadow-[inset_2px_0_0_0_var(--text-primary)]",
        dirty &&
          !selected &&
          "[&>*:first-child]:shadow-[inset_2px_0_0_0_var(--caution-mark)]",
        disabled &&
          "text-ink-3 [&_[data-cell-title]]:text-ink-2 [&_[data-cell-meta]]:text-ink-4",
        className,
      )}
      {...props}
    />
  );
}

export interface TDProps extends ComponentProps<"td"> {
  /** Right-aligned, tabular, `metric-sm`. A column that does not align on the
      digit is a defect, not a nitpick (§3.3). */
  numeric?: boolean;
}

/**
 * A cell. Padding is horizontal-plus-guard only: the row height is what sets the
 * vertical rhythm, and the guard is what a wrapped value falls back on.
 *
 * Zero-data rendering: a cell with nothing in it prints an em dash in tertiary
 * (§3.6). A blank cell and a cell with no value are different facts in a ledger,
 * and only one of them is worth trusting.
 */
export function TD({
  className,
  numeric,
  children,
  ...props
}: TDProps): ReactNode {
  const density = useContext(DensityContext);
  const empty = children === null || children === undefined || children === "";
  return (
    <td
      className={cn(
        // No rule between columns: see `TH`. The row's own hairline is the
        // only line in the table body.
        "align-middle",
        density === "compact" ? "px-5 py-2" : "px-6 py-3",
        numeric ? "t-cell tabular text-right text-ink" : "t-cell text-ink",
        className,
      )}
      {...props}
    >
      {empty ? <span className="text-ink-3"> </span> : children}
    </td>
  );
}

export interface THProps extends ComponentProps<"th"> {
  /** The 14px type icon that makes the column scannable by shape (§8.2). */
  icon?: LucideIcon;
  sortable?: boolean;
  sorted?: "asc" | "desc" | false;
  onSort?: () => void;
  numeric?: boolean;
}

/**
 * A header cell: 35px on the inset ground, a 12px label with a 14px type
 * icon and, when sortable, the reference's up/down arrow.
 *
 * The bottom rule is an inset shadow rather than a border because a collapsed
 * table stops painting a sticky cell's own border the moment it detaches.
 *
 * Zero-data rendering: the header is exactly what survives an empty table, so it
 * renders live in every state — loading, empty and error alike (§11.2, §11.4).
 */
export function TH({
  className,
  children,
  icon: Icon,
  sortable,
  sorted = false,
  onSort,
  numeric,
  ...props
}: THProps): ReactNode {
  const density = useContext(DensityContext);
  const pad = density === "compact" ? "px-5" : "px-6";

  // No icon. The reference's column heads are text and, when sortable, a
  // caret — nothing else. An icon per column turns a header row into a
  // toolbar and doubles what a 12px label already says. `icon` stays in the
  // props so the eighteen call sites still type-check, and is ignored.
  void Icon;
  const content = (
    <>
      <span className="min-w-0 truncate">{children}</span>
      {sortable ? <SortArrow sorted={sorted} /> : null}
    </>
  );

  const row = cn(
    "flex h-[35px] w-full items-center gap-3",
    pad,
    numeric && "justify-end",
  );

  return (
    <th
      scope="col"
      aria-sort={
        sortable
          ? sorted === "asc"
            ? "ascending"
            : sorted === "desc"
              ? "descending"
              : "none"
          : undefined
      }
      className={cn(
        // Measured on the reference: a 35px row on #f7f7f7 with a 12px
        // label, and no rule between columns. The vertical hairlines this
        // drops were the single loudest difference at a glance — the
        // reference's table is ruled horizontally and not at all vertically,
        // which is what lets a row read as one thing.
        // The type role goes on the `th` itself. On the span alone, a bare
        // `<TH>` with no span around its text inherited the browser's
        // default for the element — 16px at weight 700 — which is two sizes
        // and two weights away from the 12px the reference sets.
        "t-col-head sticky top-0 z-10 h-[35px] whitespace-nowrap bg-inset p-0 text-ink-2",
        "shadow-[inset_0_-1px_0_0_var(--line-border)]",
        numeric && "text-right",
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            row,
            "group/sort focus-ring-inset transition-colors duration-[var(--dur-1)] ease-linear hover:bg-state-hover hover:text-ink",
          )}
        >
          {content}
        </button>
      ) : (
        <span className={row}>{content}</span>
      )}
    </th>
  );
}

/**
 * The reference's sort affordance: a 12px up-down arrow while unsorted, in
 * `--text-quaternary`; the active direction alone, in full ink, once sorted.
 */
/**
 * The sort mark. Drawn for the column that IS sorted, and otherwise only
 * while the header is hovered or focused.
 *
 * The reference does the same, and the reason shows up the moment a table
 * has six sortable columns: six permanent ↑↓ glyphs turn a 35px header row
 * into a row of controls competing with the six words that say what the
 * columns are. The affordance is not lost — the whole cell is a button, it
 * has a hover fill, and the mark appears before the pointer reaches it.
 */
function SortArrow({ sorted }: { sorted: "asc" | "desc" | false }): ReactNode {
  const Icon =
    sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <Icon
      aria-hidden="true"
      size={12}
      strokeWidth={1.5}
      className={cn(
        "shrink-0 transition-opacity duration-[var(--dur-1)]",
        sorted
          ? "text-ink opacity-100"
          : "text-ink-4 opacity-0 group-hover/sort:opacity-100 group-focus-visible/sort:opacity-100",
      )}
    />
  );
}

export interface CellStackProps {
  title: ReactNode;
  meta?: ReactNode;
  className?: string;
}

/**
 * The two-line cell (§9.8): `body-strong` primary over `caption` tertiary, 4px
 * apart (§6.2).
 *
 * In compact the second line collapses into a hover tooltip — a native one,
 * because it is the only way to carry line 2 on forty rows without mounting a
 * portalled tooltip per cell, and it is set ONLY in compact so a comfortable
 * table never doubles a line it is already showing.
 *
 * Zero-data rendering: an absent title is an em dash in tertiary (§3.6), never a
 * blank cell — a missing value and an empty string are different facts.
 */
export function CellStack({
  title,
  meta,
  className,
}: CellStackProps): ReactNode {
  const compact = useContext(DensityContext) === "compact";
  const hasTitle = title !== null && title !== undefined && title !== "";
  const hasMeta = meta !== null && meta !== undefined && meta !== "";

  return (
    <span
      data-cell-stack=""
      title={compact && typeof meta === "string" ? meta : undefined}
      className={cn("flex min-w-0 flex-col gap-2", className)}
    >
      <span
        data-cell-title=""
        className={cn("t-cell truncate", hasTitle ? "text-ink" : "text-ink-3")}
      >
        {hasTitle ? title : NO_VALUE}
      </span>
      {hasMeta && !compact ? (
        <span data-cell-meta="" className="t-micro truncate text-ink-3">
          {meta}
        </span>
      ) : null}
    </span>
  );
}

export interface TableFooterProps {
  count: number;
  /** Pluralised for any count but 1. `record` by default. */
  noun?: string;
  /** Pagination: a rows-per-page pill, prev/next, page numbers. */
  children?: ReactNode;
  className?: string;
}

/**
 * The footer strip: a `--line-border` top rule on the card ground, the tabular
 * record count on the left and whatever the page puts on the right, usually
 * a `TablePagination`.
 *
 * Zero-data rendering: `0 records`. Zero is a count, not an absence, and it
 * renders as one (§3.5, §11.2). The footer is hidden by the PAGE when the table
 * is showing an empty state — the count of a table that is not listing anything
 * is not information.
 */
export function TableFooter({
  count,
  noun = "record",
  children,
  className,
}: TableFooterProps): ReactNode {
  const safe = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  const label = safe === 1 ? noun : pluralise(noun);

  return (
    <div
      className={cn(
        "flex min-h-[48px] flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-border bg-raised px-6 py-4",
        className,
      )}
    >
      <span className="t-caption tabular text-ink-3">
        {safe.toLocaleString("en-US")} {label}
      </span>
      {children ? (
        <div className="flex flex-wrap items-center gap-5">{children}</div>
      ) : null}
    </div>
  );
}

export interface TablePaginationProps {
  /** 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  pageSizes?: readonly number[];
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

/**
 * The reference's pagination footer: a rows-per-page select and first / prev /
 * next / last icon buttons, 28px each, with the page position between them.
 * Every value is a real number, so a single-page table still says `1 of 1`.
 */
export function TablePagination({
  page,
  pageCount,
  onPageChange,
  pageSize,
  pageSizes = [10, 20, 50],
  onPageSizeChange,
  className,
}: TablePaginationProps): ReactNode {
  const last = Math.max(1, pageCount);
  const current = Math.min(Math.max(1, page), last);
  const go = (next: number): void =>
    onPageChange(Math.min(Math.max(1, next), last));

  return (
    <div className={cn("flex flex-wrap items-center gap-5", className)}>
      {pageSize !== undefined && onPageSizeChange ? (
        <label className="t-caption flex items-center gap-3 text-ink-3">
          <span className="hidden sm:inline">Show</span>
          <Select
            size="sm"
            aria-label="Rows per page"
            value={String(pageSize)}
            onValueChange={(next) => onPageSizeChange(Number(next))}
            options={pageSizes.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
            className="w-[76px]"
          />
          <span className="hidden sm:inline">per page</span>
        </label>
      ) : null}
      <div className="flex items-center gap-2">
        <IconButton
          label="First page"
          size="sm"
          variant="secondary"
          disabled={current <= 1}
          onClick={() => go(1)}
        >
          <ChevronsLeft strokeWidth={1.5} className="size-[14px]!" />
        </IconButton>
        <IconButton
          label="Previous page"
          size="sm"
          variant="secondary"
          disabled={current <= 1}
          onClick={() => go(current - 1)}
        >
          <ChevronLeft strokeWidth={1.5} className="size-[14px]!" />
        </IconButton>
        <span className="t-caption tabular px-3 text-ink-2">
          {current} of {last}
        </span>
        <IconButton
          label="Next page"
          size="sm"
          variant="secondary"
          disabled={current >= last}
          onClick={() => go(current + 1)}
        >
          <ChevronRight strokeWidth={1.5} className="size-[14px]!" />
        </IconButton>
        <IconButton
          label="Last page"
          size="sm"
          variant="secondary"
          disabled={current >= last}
          onClick={() => go(last)}
        >
          <ChevronsRight strokeWidth={1.5} className="size-[14px]!" />
        </IconButton>
      </div>
    </div>
  );
}

function pluralise(noun: string): string {
  if (noun.endsWith("s") || noun.endsWith("x") || noun.endsWith("ch")) {
    return `${noun}es`;
  }
  if (noun.endsWith("y") && !/[aeiou]y$/.test(noun)) {
    return `${noun.slice(0, -1)}ies`;
  }
  return `${noun}s`;
}
