import type { LucideIcon } from "@/components/ui/icon";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The six roles are the entire semantic colour vocabulary of the product
 * (§4.3). Each one answers "this hue means ___" with a noun from the domain:
 *
 *   positive   head revision · merged · succeeded · accepted · healthy band
 *   caution    uncommitted · open branch · draft · expiring · stale
 *   critical   failed · revoked · conflict · breached · destructive
 *   agent      machine origin, and nothing else
 *   info       in review · the second chart series (teal, deliberately not blue)
 *   neutral    archived · closed · not started · no data
 */
export type SignalRole =
  "positive" | "caution" | "critical" | "agent" | "info" | "neutral";

export interface StatusDotProps {
  role: SignalRole;
  /** 8 in a table cell or list row, 6 as an unread marker, 10 in a page header. */
  size?: 6 | 8 | 10;
  /** The live variant: a running run, an actively-used key. */
  pulse?: boolean;
  /** `ring` = pending, scheduled or inactive — the state exists but is not yet true. */
  variant?: "solid" | "ring";
  className?: string;
}

/**
 * LEDGER INSTRUMENT — StatusDot (§9.6).
 *
 * A filled circle in the role's MARK colour — the chroma-forward value, which
 * clears 3:1 as a graphical object, not the AA text value.
 *
 * The dot is `aria-hidden` on purpose. §12.2 forbids colour as the sole carrier
 * of meaning, so a dot is ALWAYS followed by a text label at a 6px gap, and that
 * label is what assistive technology reads. A dot that announced itself would
 * double every status in the row.
 */
export function StatusDot({
  role,
  size = 8,
  pulse = false,
  variant = "solid",
  className,
}: StatusDotProps): ReactNode {
  return (
    <span
      aria-hidden="true"
      style={
        pulse
          ? {
              // A 1px ring at 2px offset in a 40%-mixed mark: `outline` is the
              // only property that draws a detached ring without needing to know
              // which surface rung the dot has landed on.
              outline: `1px solid color-mix(in oklab, var(--${role}-mark) 40%, transparent)`,
              outlineOffset: "2px",
            }
          : undefined
      }
      className={cn(
        "inline-block shrink-0 rounded-full",
        SIZE[size],
        variant === "ring"
          ? cn("border-[1.5px] bg-transparent", RING[role])
          : FILL[role],
        // opacity 1 → 0.5 and back. Under reduced motion globals.css clamps the
        // duration and count, which lands the dot on its opaque end state — the
        // static ring §7.5 asks for, with no extra rule.
        pulse &&
          "animate-pulse [animation-duration:3200ms] [animation-timing-function:var(--ease-move)]",
        className,
      )}
    />
  );
}

export interface StatusPillProps {
  role: SignalRole;
  children: ReactNode;
  /** Replaces the dot in the leading slot when the state has its own glyph. */
  icon?: LucideIcon;
  className?: string;
}

/**
 * LEDGER INSTRUMENT — StatusPill (§9.6).
 *
 * The dot carries the hue, the label carries the meaning, and neither is
 * sufficient alone. Never interactive: if a state needs a menu, the chevron goes
 * in an icon button BESIDE the pill, so a read-only indicator can never be
 * mistaken for a control.
 */
export function StatusPill({
  role,
  children,
  icon: Icon,
  className,
}: StatusPillProps): ReactNode {
  return (
    <span
      className={cn(
        // Measured on the reference's "Active": 52 x 20 with an 8px radius.
        // 0 8px 0 6px — the leading mark is optically tighter than the
        // trailing edge of a label.
        "inline-flex h-[20px] max-w-[160px] shrink-0 items-center gap-2 rounded-8 pl-3 pr-4",
        WASH[role],
        className,
      )}
    >
      {Icon ? (
        <Icon
          aria-hidden="true"
          size={12}
          strokeWidth={1.5}
          className={cn("shrink-0", MARK_TEXT[role])}
        />
      ) : (
        <StatusDot role={role} size={6} />
      )}
      {/* Sentence case, not caps. The reference labels a state the way it
          would be spoken — "Active", "Fulfilled" — and an all-caps chip in a
          13px table reads as a second heading level competing with the row. */}
      <span className={cn("t-caption-medium truncate", INK[role])}>
        {children}
      </span>
    </span>
  );
}

/* Static maps, never interpolated class names — Tailwind only ships what it can
   see in the source. */

const SIZE: Record<6 | 8 | 10, string> = {
  6: "size-[6px]",
  8: "size-[8px]",
  10: "size-[10px]",
};

const FILL: Record<SignalRole, string> = {
  positive: "bg-positive",
  caution: "bg-caution",
  critical: "bg-critical",
  agent: "bg-agent",
  info: "bg-info",
  neutral: "bg-neutral",
};

const RING: Record<SignalRole, string> = {
  positive: "border-positive",
  caution: "border-caution",
  critical: "border-critical",
  agent: "border-agent",
  info: "border-info",
  neutral: "border-neutral",
};

const MARK_TEXT: Record<SignalRole, string> = {
  positive: "text-positive",
  caution: "text-caution",
  critical: "text-critical",
  agent: "text-agent",
  info: "text-info",
  neutral: "text-neutral",
};

const WASH: Record<SignalRole, string> = {
  positive: "bg-positive-wash",
  caution: "bg-caution-wash",
  critical: "bg-critical-wash",
  agent: "bg-agent-wash",
  info: "bg-info-wash",
  neutral: "bg-neutral-wash",
};

/**
 * Neutral has no `-text` of its own, so it borrows the ink ramp (§4.3). It
 * borrows rung TWO, not rung three. Rung three is the value §9.6 names, and
 * it fails: `--neutral-wash` in dark is rgba(255,255,255,0.08), so on a raised
 * or object ground the pill's own fill lifts to #303338 and `--text-tertiary`
 * measures 4.14:1 on it, under the 4.5:1 anti-slop.md rule 6 holds dark mode
 * to. `--text-secondary` measures 5.75:1 there and 6.58:1 in light. Every other
 * role clears the bar on its own wash already; neutral is the only one whose
 * ink and ground are both drawn from the same near-grey.
 */
const INK: Record<SignalRole, string> = {
  positive: "text-positive-text",
  caution: "text-caution-text",
  critical: "text-critical-text",
  agent: "text-agent-text",
  info: "text-info-text",
  neutral: "text-ink-2",
};
