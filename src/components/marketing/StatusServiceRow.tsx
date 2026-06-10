"use client";

import { StatusBadge, type StatusBadgeTone } from "@/components/ui";
import type {
  ServiceStatus,
  UptimeService,
} from "@/lib/marketing/status-data";

/**
 * StatusServiceRow
 *
 * Single service row: name, description, status pill, uptime percentage, and
 * a tiny SVG sparkline of recent uptime history. Sparkline is a bar series of
 * normalized values; bars above 0.95 render in success, below in warning.
 */

const STATUS_TONE: Record<ServiceStatus, StatusBadgeTone> = {
  operational: "success",
  degraded: "warning",
  down: "danger",
};

const STATUS_LABEL: Record<ServiceStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
};

function Sparkline({ history }: { history: ReadonlyArray<number> }) {
  const width = 160;
  const height = 32;
  const gap = 1;
  const barWidth = (width - gap * (history.length - 1)) / history.length;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Uptime over the last 30 days"
      className="shrink-0"
    >
      {history.map((value, i) => {
        const clamped = Math.max(0, Math.min(1, value));
        const barHeight = Math.max(2, clamped * height);
        const x = i * (barWidth + gap);
        const y = height - barHeight;
        const fill = clamped >= 0.95 ? "#10B981" : clamped >= 0.5 ? "#F59E0B" : "#DC2626";
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={1}
            fill={fill}
            opacity={clamped >= 0.95 ? 0.55 : 0.9}
          />
        );
      })}
    </svg>
  );
}

export interface StatusServiceRowProps {
  service: UptimeService;
}

export function StatusServiceRow({ service }: StatusServiceRowProps) {
  const tone = STATUS_TONE[service.status];
  const label = STATUS_LABEL[service.status];
  return (
    <div
      data-testid="status-service-row"
      data-service-id={service.id}
      className="flex flex-col gap-4 rounded-3xl border border-black/[0.06] bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-3">
          <h3 className="t-h3 text-[#111]">{service.name}</h3>
          <StatusBadge tone={tone} pulse={service.status !== "operational"}>
            {label}
          </StatusBadge>
        </div>
        <p className="t-label text-[#3C3C43]">{service.description}</p>
      </div>
      <div className="flex items-center gap-6 sm:justify-end">
        <div className="flex flex-col items-start sm:items-end">
          <span
            data-testid="status-uptime"
            className="t-num text-[#111]"
            style={{
              fontSize: 22,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              fontWeight: 700,
            }}
          >
            {service.uptime90d.toFixed(2)}%
          </span>
          <span className="t-caption text-[#8E8E93]">90 day uptime</span>
        </div>
        <Sparkline history={service.history} />
      </div>
    </div>
  );
}
