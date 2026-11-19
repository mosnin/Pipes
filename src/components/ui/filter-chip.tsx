"use client";

import type { LucideIcon } from "@/components/ui/icon";
import { X } from "@/components/ui/icon";
import Link from "next/link";
import {
  Children,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { SignalRole } from "@/components/ledger/status";
import { cn } from "@/lib/utils";

/**
 * LEDGER INSTRUMENT — Filter chip and chip bar (§9.4).
 *
 * The selected state is an INVERTED MONOCHROME FILL, not a tint. Selection is
 * chrome, and chrome carries no hue (P1): a tinted active chip would put a
 * seventh, meaningless colour next to the six status roles that a chip row is
 * usually filtering by. The one hue a chip may carry is the 6px status dot of
 * the role it filters for.
 */

export interface FilterChipProps {
  active?: boolean;
  /** Rendered as part of the label, in parentheses, one text tier lighter. */
  count?: number;
  icon?: LucideIcon;
  /** Status-filter variant: a 6px mark-coloured dot — the only hue a chip carries. */
  dot?: SignalRole;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  /** Zero matches available: 40% opacity and not clickable (§9.4). */
  disabled?: boolean;
  /** Renders the trailing 12px ×. Only meaningful on a button chip. */
  onRemove?: () => void;
  className?: string;
}

const DOT_FILL: Record<SignalRole, string> = {
  positive: "bg-positive",
  caution: "bg-caution",
  critical: "bg-critical",
  agent: "bg-agent",
  info: "bg-info",
  neutral: "bg-neutral",
};

export function FilterChip({
  active = false,
  count,
  icon: Icon,
  dot,
  children,
  onClick,
  href,
  disabled = false,
  onRemove,
  className,
}: FilterChipProps): ReactNode {
  const hasLeading = Boolean(Icon) || Boolean(dot);

  const shell = cn(
    "relative inline-flex h-[32px] shrink-0 select-none items-center gap-1.5",
    "whitespace-nowrap rounded-full border t-caption-strong outline-none",
    // §9.1's ban on `transition: all` holds everywhere: only what changes.
    "transition-[background-color,border-color,color] duration-[var(--dur-2)] ease-[var(--ease-out)]",
    // A 14px leading element buys its room out of the horizontal padding so the
    // chip does not grow into a lozenge.
    hasLeading ? "px-2" : "px-3",
    active
      ? "border-transparent bg-inverse text-ink-inverse hover:bg-inverse-hover"
      : "border-border bg-raised text-ink-2 hover:border-strong hover:bg-state-hover hover:text-ink",
    // A chip that matches nothing but is still selectable stays enabled and
    // steps its label back a tier — absence and zero are different facts.
    !active && count === 0 && "text-ink-3",
    disabled && "pointer-events-none opacity-40",
    className,
  );

  const body = (
    <>
      {dot ? (
        <span
          aria-hidden="true"
          className={cn(
            "size-[6px] shrink-0 rounded-full",
            // On the inverted fill the mark hue would sink into the ink, so the
            // dot flips to the card surface and stays a visible token (§9.4).
            active ? "bg-raised" : DOT_FILL[dot],
          )}
        />
      ) : null}
      {Icon ? (
        <Icon
          aria-hidden="true"
          className="size-[14px] shrink-0"
          strokeWidth={1.25}
        />
      ) : null}
      <span>{children}</span>
      {count !== undefined ? (
        <span
          className={cn(
            "tabular",
            active ? "text-ink-inverse/70" : "text-ink-3",
          )}
        >
          ({count})
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        // A link cannot be "pressed"; its selected state is a current-page claim.
        aria-current={active ? "page" : undefined}
        aria-disabled={disabled || undefined}
        className={cn(shell, "focus-ring")}
        onClick={onClick}
      >
        {body}
      </Link>
    );
  }

  if (onRemove) {
    // A removable chip is TWO controls, so it cannot be one `<button>` with a
    // nested one: the shell becomes a plain box and the focus ring is driven by
    // whichever of the two children holds focus.
    return (
      <span
        className={cn(
          shell,
          "pr-1",
          "has-[:focus-visible]:shadow-[0_0_0_2px_var(--surface-raised),0_0_0_4px_var(--focus-ring)]",
        )}
      >
        <button
          type="button"
          aria-pressed={active}
          disabled={disabled}
          onClick={onClick}
          className="inline-flex items-center gap-1.5 outline-none"
        >
          {body}
        </button>
        <button
          type="button"
          aria-label="Remove filter"
          disabled={disabled}
          onClick={onRemove}
          className={cn(
            "inline-flex size-[18px] shrink-0 items-center justify-center rounded-full outline-none",
            "transition-colors duration-[var(--dur-1)] ease-linear",
            active ? "hover:bg-ink-inverse/20" : "hover:bg-state-active",
          )}
        >
          <X aria-hidden="true" className="size-[12px]" strokeWidth={1.25} />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(shell, "focus-ring")}
    >
      {body}
    </button>
  );
}

/**
 * The 1px × 18px hairline that separates the `All (N)` scope chip from the
 * facet chips. §9.4 is explicit that this rule is what turns a chip row into a
 * control rather than a pile, so it is a named part rather than a caller's
 * ad-hoc div.
 */
export function ChipRule({ className }: { className?: string }): ReactNode {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mx-3 h-[18px] w-px shrink-0 self-center bg-hairline",
        className,
      )}
    />
  );
}

/**
 * Horizontal chip bar: 8px gaps, scrolls rather than wraps, and fades only the
 * edges that actually have content beyond them — an unconditional mask fades
 * the first chip of a row that cannot scroll, which reads as a rendering fault.
 */
export function ChipRow({
  className,
  children,
  style,
  ...props
}: ComponentProps<"div">): ReactNode {
  const ref = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  // No dependency array: the row's scrollable extent changes whenever its chips
  // change, and the identity guard below makes a re-run cheap and loop-free.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = (): void => {
      const max = el.scrollWidth - el.clientWidth;
      const next = {
        start: el.scrollLeft > 1,
        end: max > 1 && el.scrollLeft < max - 1,
      };
      setEdges((prev) =>
        prev.start === next.start && prev.end === next.end ? prev : next,
      );
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  });

  const mask = edgeMask(edges.start, edges.end);

  return (
    <div
      ref={ref}
      role="group"
      className={cn(
        "flex items-center gap-2 overflow-x-auto",
        // The bar owns its own scrolling so the page body never scrolls
        // sideways (§12.7); the scrollbar itself is chrome we do not want.
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      style={
        mask ? { maskImage: mask, WebkitMaskImage: mask, ...style } : style
      }
      {...props}
    >
      {Children.toArray(children).length > 0 ? (
        children
      ) : (
        // §9.4: the bar is never omitted when there is nothing to filter,
        // because an absent bar and a zero result look identical.
        <FilterChip disabled count={0}>
          All
        </FilterChip>
      )}
    </div>
  );
}

/** 24px `mask-image` fades on whichever edges have content past them (§9.4, §9.9). */
export function edgeMask(
  start: boolean,
  end: boolean,
): CSSProperties["maskImage"] {
  if (start && end) {
    return "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)";
  }
  if (start) return "linear-gradient(to right, transparent 0, black 24px)";
  if (end)
    return "linear-gradient(to right, black calc(100% - 24px), transparent 100%)";
  return undefined;
}
