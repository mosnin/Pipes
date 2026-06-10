"use client";

// Animated metrics row. Three large numbers that tick up from 0 the first
// time they enter the viewport. Each metric:
//   - "value" is the numeric target (e.g. 67)
//   - "prefix" / "suffix" wrap the value ("$", "%", "x", " days")
//   - "label" describes what the number means
//
// Reduced motion: counters render their final value with no animation.

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

export type UseCaseMetric = {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
};

interface UseCaseMetricsRowProps {
  metrics: readonly UseCaseMetric[];
  className?: string;
}

const COUNT_DURATION_MS = 1100;

function Counter({
  target,
  active,
  reduce,
}: {
  target: number;
  active: boolean;
  reduce: boolean;
}) {
  const [display, setDisplay] = useState(reduce ? target : 0);
  const startedAt = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (!active || reduce) {
      if (reduce) setDisplay(target);
      return;
    }
    startedAt.current = null;
    const tick = (now: number) => {
      if (startedAt.current == null) startedAt.current = now;
      const elapsed = now - startedAt.current;
      const t = Math.min(1, elapsed / COUNT_DURATION_MS);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * target));
      if (t < 1) {
        rafId.current = requestAnimationFrame(tick);
      }
    };
    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
  }, [active, target, reduce]);

  return <>{display}</>;
}

export function UseCaseMetricsRow({
  metrics,
  className,
}: UseCaseMetricsRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion() ?? false;

  return (
    <div
      ref={ref}
      className={[
        "grid grid-cols-1 sm:grid-cols-3 gap-3",
        className ?? "",
      ].join(" ")}
    >
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-2xl border border-black/[0.06] bg-white p-5"
        >
          <div
            className="t-num text-[#111]"
            style={{
              fontSize: 40,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              fontWeight: 700,
            }}
          >
            {metric.prefix != null && (
              <span className="text-[#3C3C43]">{metric.prefix}</span>
            )}
            <Counter target={metric.value} active={inView} reduce={reduce} />
            {metric.suffix != null && (
              <span className="text-[#3C3C43]">{metric.suffix}</span>
            )}
          </div>
          <p className="mt-2 t-caption text-[#8E8E93] leading-snug">
            {metric.label}
          </p>
        </div>
      ))}
    </div>
  );
}
