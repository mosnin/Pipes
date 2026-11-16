"use client";

/**
 * Hook sidebar, from Rare UI (https://rareui.com) by Swami Malode.
 * Copyright (c) 2026 Swami Malode. MIT + Commons Clause + Attribution; see NOTICE.
 *
 * Adapted for Podium, then for Pipes (Next.js routing). The original renders its own rows; here `HookList` wraps
 * rows the app already renders (NavLinks, buttons) and draws the original's
 * rails beside them: a solid rail from the top of the list that hooks into the
 * current row (`aria-current`), and a faint dashed rail that follows the
 * pointer or keyboard focus. `ReplyHook` is the same corner drawn once, to tie
 * a message to its replies. Geometry and spring are the original's; colours
 * come from the app's tokens.
 */
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { cn as cx } from "@/lib/utils";

const CORNER = 6;
const DASH = "repeating-linear-gradient(to top, transparent 0 2px, currentColor 2px 4px)";

function Rail({ from = 0, y, visible, color, dashed, className }: { from?: number; y: number | null; visible: boolean; color?: string; dashed: boolean; className?: string }) {
  const reduced = useReducedMotion();
  const travel = reduced ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.7 };
  return (
    <motion.span
      aria-hidden
      data-rail
      initial={false}
      style={{ color }}
      animate={{ opacity: visible && y !== null ? 1 : 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.2 }}
      className={cx("pointer-events-none absolute inset-y-0 left-0 w-3", className)}
    >
      <motion.span
        initial={false}
        animate={{ top: from, height: Math.max(0, (y ?? 0) - CORNER - from) }}
        transition={travel}
        style={dashed ? { backgroundImage: DASH } : { backgroundColor: "currentColor" }}
        className="absolute left-0.5 w-px"
      />
      <motion.svg initial={false} animate={{ top: (y ?? 0) - CORNER }} transition={travel} width="12" height="7" viewBox="0 0 12 7" fill="none" className="absolute left-0.5">
        <path d="M0.5 0a6 6 0 0 0 6 6H12" stroke="currentColor" strokeDasharray={dashed ? "2 2" : undefined} />
      </motion.svg>
    </motion.span>
  );
}

/** Rows with a rail that hooks into the current one. Rows are the list's direct children. */
export function HookList({ children, className, color = "var(--accent)", start = -8 }: { children: ReactNode; className?: string; color?: string; /** Where the rail starts, relative to the first row (negative reaches up under a heading). */ start?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [centers, setCenters] = useState<number[]>([]);
  const [active, setActive] = useState(-1);
  const [hover, setHover] = useState<number | null>(null);
  const [inside, setInside] = useState(false);

  const rows = () => Array.from(ref.current?.children ?? []).filter((el) => !(el as HTMLElement).dataset.rail) as HTMLElement[];
  const indexOf = (target: EventTarget | null) => rows().findIndex((r) => r.contains(target as Node));

  useLayoutEffect(() => {
    const list = ref.current;
    if (!list) return;
    const measure = () => {
      const rs = rows();
      setCenters(rs.map((el) => el.offsetTop + el.offsetHeight / 2));
      setActive(rs.findIndex((el) => el.getAttribute("aria-current") === "page" || !!el.querySelector('[aria-current="page"]')));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    const mo = new MutationObserver(measure);
    mo.observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current"] });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setHover(null), [pathname]);

  const activeY = active < 0 ? null : (centers[active] ?? null);
  const hoverY = hover === null || hover < 0 ? null : (centers[hover] ?? null);
  // Above the current row the solid rail already covers the span, so draw only the corner.
  const hoverFrom = activeY !== null && hoverY !== null && hoverY <= activeY ? Math.max(0, hoverY - CORNER) : (activeY ?? start);

  return (
    <div
      ref={ref}
      className={cx("relative pl-3.5", className)}
      onPointerOver={(e) => {
        setInside(true);
        setHover(indexOf(e.target));
      }}
      onPointerLeave={() => setInside(false)}
      onFocus={(e) => {
        setInside(true);
        setHover(indexOf(e.target));
      }}
      onBlur={() => setInside(false)}
    >
      <Rail from={hoverFrom} y={hoverY} visible={inside && hover !== active} dashed className="text-foreground/25" />
      <Rail from={start} y={activeY} visible={activeY !== null} color={color} dashed={false} />
      {children}
    </div>
  );
}

/**
 * The hook on its own, tying a message to its replies: a dashed line from under
 * the avatar that turns into the replies row. Place it in a `relative` column.
 */
export function ReplyHook({ top, reach, className }: { top: number; reach: number; className?: string }) {
  return (
    <span aria-hidden className={cx("pointer-events-none absolute bottom-3 left-1/2", className)} style={{ top, width: reach }}>
      <span className="absolute bottom-[6px] left-0 top-0 w-px" style={{ backgroundImage: DASH }} />
      <svg className="absolute bottom-0 left-0 overflow-visible" width={reach} height="7" viewBox={`0 0 ${reach} 7`} fill="none">
        <path d={`M0.5 0a6 6 0 0 0 6 6H${reach}`} stroke="currentColor" strokeDasharray="2 2" />
      </svg>
    </span>
  );
}
