import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface RevisionRailProps {
  children: ReactNode;
  className?: string;
}

/**
 * LEDGER INSTRUMENT — RevisionRail (§9.23). The signature structure of the
 * product: wherever something has history, the history runs down its left edge.
 *
 * THE CONSTRUCTION DETAIL THAT MATTERS: this container draws NOTHING. It owns no
 * spine, no line, no absolute element of its own. Every segment of the spine is
 * drawn by the row that owns it, inside that row's own 28px grid track.
 *
 * That is not a stylistic preference. The code being replaced drew
 * `absolute left-[11px] top-5 h-full w-px` on the container — one tall line,
 * byte-identical in two pages — which is a construction that cannot survive
 * windowed rendering of a long history: the container's height is not the sum of
 * the rendered rows, so the line either stops short or runs past the last commit
 * into empty space. A per-row segment is always exactly as long as the row it is
 * in, so ten commits and ten thousand behave identically.
 *
 * It also means the empty case is free and cannot be got wrong: no rows, no
 * segments, no spine. A rail with no commits would be a lie about history, so
 * the caller renders an EmptyState instead (§11.3) and this component simply has
 * nothing to draw.
 */
export function RevisionRail({
  children,
  className,
}: RevisionRailProps): ReactNode {
  return <ol className={cn("flex list-none flex-col", className)}>{children}</ol>;
}

export interface RailRowProps {
  /** The `<CommitNode>` for this row, placed on the spine. */
  node: ReactNode;
  children: ReactNode;
  /** Suppresses the spine below the node and terminates it in a rounded cap. */
  last?: boolean;
  className?: string;
}

/**
 * One commit, one row, one grid: `28px | content`.
 *
 * The node's vertical centre sits 14px from the row top — the optical centre of
 * the row's FIRST TEXT LINE, not the geometric centre of the row. A node centred
 * on the box drifts away from the message it belongs to the moment a row grows a
 * second line, which every commit row has.
 */
export function RailRow({
  node,
  children,
  last = false,
  className,
}: RailRowProps): ReactNode {
  return (
    <li
      className={cn(
        "relative grid grid-cols-[var(--rail-gutter)_minmax(0,1fr)] items-stretch",
        className,
      )}
    >
      {/* NOT `aria-hidden`: the spine segments below are empty and announce
          nothing on their own, but the node inside carries the screen-reader
          label for its state, and hiding the whole track would delete it. */}
      <span className="relative">
        {/* Above the node. Hidden on the first row: the spine terminates flush
            with the head node's top, because there is no history above the head
            and a 14px stub there would claim there is. The selector is pinned to
            this exact depth so a rail nested inside some other list cannot
            accidentally satisfy it. */}
        <span className="absolute left-1/2 top-0 h-[14px] w-px -translate-x-1/2 bg-hairline [ol>li:first-child>span>&]:hidden" />

        {last ? (
          // The terminus: 1px down past the node, then a 3px rounded cap. A line
          // that simply stops at the row edge reads as truncated history.
          <>
            <span className="absolute left-1/2 top-[14px] h-[12px] w-px -translate-x-1/2 bg-hairline" />
            <span className="absolute left-1/2 top-[25px] size-[3px] -translate-x-1/2 rounded-full bg-hairline" />
          </>
        ) : (
          <span className="absolute bottom-0 left-1/2 top-[14px] w-px -translate-x-1/2 bg-hairline" />
        )}

        {/* Last in the source so the node's own fill covers the spine behind it. */}
        <span className="absolute left-1/2 top-[14px] -translate-x-1/2 -translate-y-1/2">
          {node}
        </span>
      </span>

      <div
        className={cn(
          // THE RAIL EXCEPTION (§5.3): square on the edge that touches the spine,
          // rounded on the other. The row yields its corner so the spine reads as
          // one continuous bound edge instead of a stack of interrupted arcs.
          "relative min-h-[60px] rounded-r-lg py-3 pl-3 pr-4",
          "transition-colors duration-[var(--dur-1)] ease-linear",
          // The hover fill is conditional on the row actually containing
          // something pressable. A state fill under a cursor that has nothing to
          // click is a promise the row cannot keep.
          "has-[a]:hover:bg-state-hover has-[button]:hover:bg-state-hover",
        )}
      >
        {children}
      </div>

      {/* The row separator starts clear of the rail track so it never crosses the
          spine — the spine has to read as continuous through the whole history. */}
      {last ? null : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-[calc(var(--rail-gutter)+12px)] right-0 h-px bg-hairline"
        />
      )}
    </li>
  );
}

export interface CommitNodeProps {
  kind?: "human" | "agent";
  state?: "head" | "normal" | "branch" | "conflict";
  /** An unfilled future node — the blank slate's "your first commit goes here". */
  hollow?: boolean;
  className?: string;
}

/**
 * LEDGER INSTRUMENT — CommitNode (§5.3, §9.23).
 *
 * A HUMAN COMMIT IS A CIRCLE, AN AGENT COMMIT IS A ROUNDED SQUARE, at the same
 * optical size. Authorship is encoded in shape, so it survives a greyscale
 * print, a colour-blind reader and a 9px rendering — none of which a violet-only
 * convention survives. Hue is then free to mean state and only state: head is
 * positive, a branch point is agent, a conflict is critical, and everything else
 * is `--text-tertiary`.
 *
 * The head node is the only one with two rings — a filled dot, a gap in the
 * ground colour, then a 1px outer ring: a reticle, which is what you want on the
 * one node that answers "where am I".
 */
export function CommitNode({
  kind = "human",
  state = "normal",
  hollow = false,
  className,
}: CommitNodeProps): ReactNode {
  const shape = kind === "agent" ? "rounded-2" : "rounded-full";
  const label = hollow ? "Not yet committed" : STATE_LABEL[state];
  const isHead = state === "head" && !hollow;

  return (
    <span
      className={cn(
        "relative block shrink-0",
        shape,
        isHead
          ? // 10px fill + a 3px gap in the ground + a 1px ring standing off it.
            "size-[10px] bg-positive shadow-[0_0_0_3px_var(--surface-canvas),0_0_0_4px_var(--positive-mark)]"
          : cn(
              "size-[9px] border-[1.5px]",
              hollow
                ? // A node that has not happened yet: no fill to read as a
                  // commit, and the quaternary ramp because it is not
                  // information, it is an invitation (§3.6).
                  "border-ink-4 bg-transparent"
                : cn("bg-canvas", RING[state]),
            ),
        className,
      )}
    >
      {state === "conflict" && !hollow ? (
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-critical"
        />
      ) : null}
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}

const RING: Record<NonNullable<CommitNodeProps["state"]>, string> = {
  head: "border-positive",
  normal: "border-ink-3",
  branch: "border-agent",
  conflict: "border-critical",
};

/**
 * Colour is never the sole carrier (§12.2). Shape tells a sighted reader human
 * from agent; this tells everyone else what the ring means.
 */
const STATE_LABEL: Record<
  NonNullable<CommitNodeProps["state"]>,
  string | null
> = {
  head: "Head revision",
  normal: null,
  branch: "Branch point",
  conflict: "Merge conflict",
};
