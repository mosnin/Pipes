import {
  Bot,
  CircleCheck,
  CircleDashed,
  Info,
  OctagonAlert,
  TriangleAlert,
  type LucideIcon,
} from "@/components/ui/icon";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ==========================================================================
   BANNER / CALLOUT — §9.35

   The one place a role wash is allowed to tint a full-width block. Three cues
   carry the role and all three are mandatory: a 3px left rule in the mark
   colour, a leading glyph, and the wash ground. Colour is never the sole
   carrier (§12.2) — strip the hue and the glyph still says which of the six
   this is, which is exactly what a greyscale screenshot must survive.

   Product uses: unconverted spend (critical) · key expiring in 3 days
   (caution) · merge conflict present (critical) · viewing a historical
   revision (caution, non-dismissible, sticky under the top bar) · editing on a
   branch overlay (agent, non-dismissible) · AI or media not configured
   (neutral, with a real action).
   ========================================================================== */

export type BannerRole =
  "positive" | "caution" | "critical" | "agent" | "info" | "neutral";

/**
 * The glyph is bound to the role rather than passed in, so the colour can never
 * be doubled with the wrong shape. Full class strings, because Tailwind reads
 * source text — a template literal would compile to nothing.
 */
const ROLE: Record<
  BannerRole,
  { icon: LucideIcon; ground: string; bar: string; glyph: string }
> = {
  positive: {
    icon: CircleCheck,
    ground: "bg-positive-wash border-positive-border",
    bar: "before:bg-positive",
    glyph: "text-positive-text",
  },
  caution: {
    icon: TriangleAlert,
    ground: "bg-caution-wash border-caution-border",
    bar: "before:bg-caution",
    glyph: "text-caution-text",
  },
  critical: {
    icon: OctagonAlert,
    ground: "bg-critical-wash border-critical-border",
    bar: "before:bg-critical",
    glyph: "text-critical-text",
  },
  agent: {
    icon: Bot,
    ground: "bg-agent-wash border-agent-border",
    bar: "before:bg-agent",
    glyph: "text-agent-text",
  },
  info: {
    icon: Info,
    ground: "bg-info-wash border-info-border",
    bar: "before:bg-info",
    glyph: "text-info-text",
  },
  neutral: {
    icon: CircleDashed,
    ground: "bg-neutral-wash border-neutral-border",
    bar: "before:bg-neutral",
    glyph: "text-neutral-text",
  },
};

export interface BannerProps {
  role?: BannerRole;
  title?: ReactNode;
  children?: ReactNode;
  /** A ghost action, right-aligned and top-aligned with the title. */
  action?: ReactNode;
  className?: string;
}

export function Banner({
  role = "neutral",
  title,
  children,
  action,
  className,
}: BannerProps): ReactNode {
  // Zero-data rendering: a banner with nothing to say is not a coloured strip,
  // it is nothing. "Unconfigured service" states must carry a real sentence and
  // a real action (§11.5), never an empty tinted box.
  if (!title && !children) return null;

  const { icon: Glyph, ground, glyph } = ROLE[role];

  return (
    <div
      className={cn(
        // Podium's notice: a 10 to 12% tint on a 14px inset. No border, no side bar.
        "relative flex w-full items-start gap-2.5 rounded-[14px] px-3.5 py-3",
        ground.split(" ")[0],
        className,
      )}
    >
      <Glyph
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
        className={cn("mt-px shrink-0", glyph)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? <p className="text-[13px] font-medium text-foreground">{title}</p> : null}
        {children ? (
          <div className="text-[13px] text-muted-foreground">{children}</div>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
