"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

/**
 * MetricsStrip
 *
 * Four large counters that animate from 0 to their target ONCE when the
 * strip first enters the viewport. Ease-out over ~1.4s. Respects reduced
 * motion (renders the final value immediately).
 */

export interface Metric {
  value: number;
  suffix?: string;
  prefix?: string;
  /** What this number measures. */
  label: string;
  /** Decimal places to render. Default 0. */
  decimals?: number;
}

export interface MetricsStripProps {
  metrics: ReadonlyArray<Metric>;
}

const DURATION_MS = 1400;

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function MetricsStrip({ metrics }: MetricsStripProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  return (
    <section className="px-4 sm:px-6">
      <div
        ref={ref}
        className="mx-auto grid max-w-7xl grid-cols-2 gap-6 border-y border-black/[0.06] py-16 lg:grid-cols-4 lg:gap-10"
      >
        {metrics.map((m) => (
          <MetricCounter key={m.label} metric={m} active={inView} />
        ))}
      </div>
    </section>
  );
}

function MetricCounter({
  metric,
  active,
}: {
  metric: Metric;
  active: boolean;
}) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState<number>(reduced ? metric.value : 0);
  const startedRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    if (startedRef.current) return;
    if (reduced) {
      setDisplay(metric.value);
      startedRef.current = true;
      return;
    }
    startedRef.current = true;
    const start = performance.now();
    const target = metric.value;
    function step(now: number): void {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const eased = easeOutQuart(t);
      setDisplay(eased * target);
      if (t < 1) rafRef.current = window.requestAnimationFrame(step);
    }
    rafRef.current = window.requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [active, metric.value, reduced]);

  const formatted = formatMetric(display, metric);

  return (
    <div className="flex flex-col gap-2" data-testid="metric-counter">
      <span
        className="t-num text-[#111]"
        style={{
          fontSize: 56,
          lineHeight: 1.0,
          letterSpacing: "-0.035em",
          fontWeight: 700,
        }}
        aria-label={`${formatMetric(metric.value, metric)} ${metric.label}`}
      >
        {formatted}
      </span>
      <span className="t-label text-[#3C3C43]" style={{ fontSize: 14 }}>
        {metric.label}
      </span>
    </div>
  );
}

function formatMetric(value: number, metric: Metric): string {
  const decimals = metric.decimals ?? 0;
  const rounded = decimals === 0 ? Math.round(value) : value.toFixed(decimals);
  const num =
    decimals === 0
      ? new Intl.NumberFormat("en-US").format(Number(rounded))
      : String(rounded);
  return `${metric.prefix ?? ""}${num}${metric.suffix ?? ""}`;
}
