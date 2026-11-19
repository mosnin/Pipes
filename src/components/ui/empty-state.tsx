import type { ReactNode } from "react";
import { EmptyArt, type EmptyArtKind } from "@/components/ui/empty-art";
import { TriangleAlert, type LucideIcon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/* ==========================================================================
   EMPTY STATE, Podium's (docs/DESIGN.md, Empty states).

   A small isometric figure in sky blue, a medium title, one muted sentence
   and the action that fills the list. Centred. The variant picks the figure
   and the action's role: never-created offers creation, filtered-out offers
   clearing, permission offers nothing to create. An error is the one state
   without art: it is a status, so it gets the destructive icon tile.
   ========================================================================== */

export type EmptyVariant =
  "never" | "filtered" | "search" | "error" | "permission";

const VARIANT_ART: Record<Exclude<EmptyVariant, "error">, EmptyArtKind> = {
  never: "files",
  filtered: "search",
  search: "search",
  permission: "pins",
};

export interface EmptyStateProps {
  /** Overrides the variant's default glyph with the object's own type marker. */
  icon?: LucideIcon;
  /** Names the object and its verb: `No revisions yet`, `No agent keys issued`. */
  title: string;
  /** What will appear here and why. For `error`, the id in `t-mono-hash`. */
  body?: ReactNode;
  /** `never` creates · `filtered` clears (secondary) · `error` retries. */
  action?: ReactNode;
  secondaryAction?: ReactNode;
  variant?: EmptyVariant;
  /**
   * Replace the tile with git's empty-tree hash. **Version-control surfaces
   * only** — timeline, document history, branch list, diff (anti-pattern 77).
   * A finance department at zero data gets the neutral tile: a git in-joke is
   * not the mark a CFO should meet first.
   */
  emptyTree?: boolean;
  /** Pick the figure yourself when the list has an obvious one (people, activity, apps...). */
  art?: EmptyArtKind;
  /** Smaller figure and tighter padding, for side panels and cards. */
  compact?: boolean;
  /**
   * The title is a paragraph by default so the surrounding outline stays the
   * page's. When the empty state IS the page (a not-found route), pass `h1`
   * so the document still has its one level-one heading.
   */
  titleAs?: "p" | "h1" | "h2";
  className?: string;
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  secondaryAction,
  variant = "never",
  art,
  compact = false,
  titleAs: Title = "p",
  className,
}: EmptyStateProps): ReactNode {
  const ErrorGlyph: LucideIcon = icon ?? TriangleAlert;
  return (
    <div
      className={cn(
        "t-enter mx-auto flex w-full max-w-sm flex-col items-center text-center",
        compact ? "gap-1.5 px-4 py-6" : "gap-2 px-6 py-10",
        className,
      )}
    >
      {variant === "error" ? (
        <span aria-hidden="true" className="mb-1 flex size-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <ErrorGlyph className="size-5" />
        </span>
      ) : (
        <EmptyArt kind={art ?? VARIANT_ART[variant]} size={compact ? 96 : 132} className={compact ? "mb-0.5" : "-mb-1"} />
      )}
      <Title className="text-[14px] font-medium text-foreground">{title}</Title>
      {body ? <div className="text-[13px] leading-5 text-pretty text-muted-foreground">{body}</div> : null}
      {action || secondaryAction ? (
        <div className={cn("flex flex-wrap items-center justify-center gap-2", compact ? "mt-2" : "mt-3")}>
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
