"use client";

import { StatusBadge, type StatusBadgeTone } from "@/components/ui";
import type {
  IncidentSeverity,
  PastIncident,
  UptimeService,
} from "@/lib/marketing/status-data";

/**
 * StatusIncidentLog
 *
 * Past incidents list with severity pill, title, started/resolved
 * timestamps, brief postmortem, and the services that were affected.
 */

const SEVERITY_TONE: Record<IncidentSeverity, StatusBadgeTone> = {
  "sev-1": "danger",
  "sev-2": "warning",
  "sev-3": "info",
};

const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  "sev-1": "Sev-1",
  "sev-2": "Sev-2",
  "sev-3": "Sev-3",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(d);
}

function minutesBetween(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(diff / 60000);
}

export interface StatusIncidentLogProps {
  incidents: ReadonlyArray<PastIncident>;
  services: ReadonlyArray<UptimeService>;
}

export function StatusIncidentLog({
  incidents,
  services,
}: StatusIncidentLogProps) {
  const serviceNameById = new Map(services.map((s) => [s.id, s.name]));
  return (
    <div className="flex flex-col gap-5">
      {incidents.map((incident) => {
        const duration = minutesBetween(incident.startedAt, incident.resolvedAt);
        return (
          <article
            key={incident.id}
            data-testid="status-incident-card"
            className="rounded-3xl border border-black/[0.06] bg-white p-7"
          >
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge tone={SEVERITY_TONE[incident.severity]}>
                {SEVERITY_LABEL[incident.severity]}
              </StatusBadge>
              <StatusBadge tone="neutral">Resolved</StatusBadge>
              <span className="t-caption text-[#8E8E93]">
                {duration} minute resolution window
              </span>
            </div>
            <h3 className="mt-4 t-h2 text-[#111]">{incident.title}</h3>
            <dl className="mt-3 grid grid-cols-1 gap-3 t-caption text-[#3C3C43] sm:grid-cols-2">
              <div>
                <dt className="t-overline text-[#8E8E93]">Started</dt>
                <dd>{formatTime(incident.startedAt)}</dd>
              </div>
              <div>
                <dt className="t-overline text-[#8E8E93]">Resolved</dt>
                <dd>{formatTime(incident.resolvedAt)}</dd>
              </div>
            </dl>
            <p className="mt-5 t-body text-[#3C3C43] leading-relaxed">
              {incident.postmortem}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-black/[0.06] pt-4">
              <span className="t-overline text-[#8E8E93]">Components</span>
              {incident.affectedServiceIds.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center rounded-full border border-black/[0.08] bg-[#FAFAFA] px-2.5 py-1 t-caption text-[#3C3C43]"
                >
                  {serviceNameById.get(id) ?? id}
                </span>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
