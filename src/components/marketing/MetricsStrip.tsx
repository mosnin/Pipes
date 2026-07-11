"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

export interface Metric {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
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
  const inView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <section className="px-4 sm:px-6">
      <div ref={ref} className="mx-auto max-w-7xl py-10">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {metrics.map((m, i) => (
            <MetricCard key={m.label} metric={m} active={inView} featured={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  metric,
  active,
  featured,
}: {
  metric: Metric;
  active: boolean;
  featured: boolean;
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
  const finalFormatted = formatMetric(metric.value, metric);

  if (featured) {
    return (
      <div
        data-testid="metric-counter"
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
          boxShadow: "0 4px 24px rgba(124,58,237,0.28)",
        }}
      >
        <div className="relative z-10">
          <p className="text-violet-200 mb-4" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {metric.label}
          </p>
          <span
            className="t-num block text-white"
            style={{ fontSize: 52, lineHeight: 1.0, letterSpacing: "-0.04em", fontWeight: 700 }}
            aria-label={`${finalFormatted} ${metric.label}`}
          >
            {formatted}
          </span>
        </div>
        {/* Decorative circles */}
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{ width: 120, height: 120, right: -20, bottom: -20, background: "rgba(255,255,255,0.08)" }}
        />
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{ width: 72, height: 72, right: 16, bottom: 16, background: "rgba(255,255,255,0.07)" }}
        />
      </div>
    );
  }

  return (
    <div
      data-testid="metric-counter"
      className="rounded-2xl bg-white p-6"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(124,58,237,0.05)" }}
    >
      <p className="text-[#8E8E93] mb-4" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {metric.label}
      </p>
      <span
        className="t-num block text-[#111]"
        style={{ fontSize: 40, lineHeight: 1.0, letterSpacing: "-0.04em", fontWeight: 700 }}
        aria-label={`${finalFormatted} ${metric.label}`}
      >
        {formatted}
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
