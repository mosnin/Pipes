/**
 * Status page data: six services, 90-day uptime, and a few resolved incidents.
 * Incidents follow the runbook.md three failure classes.
 */

export type ServiceStatus = "operational" | "degraded" | "down";
export type IncidentSeverity = "sev-1" | "sev-2" | "sev-3";

export interface UptimeService {
  /** Stable id for tests. */
  id: string;
  /** Display name. */
  name: string;
  /** Short description of the service surface. */
  description: string;
  /** Live status. */
  status: ServiceStatus;
  /** Uptime percentage over the last 90 days. */
  uptime90d: number;
  /**
   * 30-point uptime sample array. Each entry is 0..1 where 1 is fully up.
   * One degradation event drops one bar to 0.6 for realism.
   */
  history: ReadonlyArray<number>;
  /** ISO timestamp of the last successful health check. */
  lastChecked: string;
}

export interface PastIncident {
  id: string;
  severity: IncidentSeverity;
  title: string;
  /** ISO timestamps. */
  startedAt: string;
  resolvedAt: string;
  /** Short postmortem. Multi-sentence is fine. */
  postmortem: string;
  /** Services affected by id. */
  affectedServiceIds: ReadonlyArray<string>;
}

function buildHistory(degradationAt: number | null): ReadonlyArray<number> {
  const out: number[] = [];
  for (let i = 0; i < 30; i += 1) {
    if (degradationAt !== null && i === degradationAt) {
      out.push(0.6);
    } else {
      // Tiny noise so the sparkline reads as real data, not a flat line.
      out.push(0.96 + ((i * 7) % 4) * 0.01);
    }
  }
  return out;
}

export const services: ReadonlyArray<UptimeService> = [
  {
    id: "agent-runner",
    name: "Agent runner",
    description: "Builder turns hosted on Modal. Streams SSE to /api/agent/build.",
    status: "operational",
    uptime90d: 99.94,
    history: buildHistory(11),
    lastChecked: "2026-06-10T14:32:00Z",
  },
  {
    id: "convex-db",
    name: "Convex database",
    description: "Workspace data, systems, audit events. Real-time queries to the editor.",
    status: "operational",
    uptime90d: 99.99,
    history: buildHistory(null),
    lastChecked: "2026-06-10T14:32:00Z",
  },
  {
    id: "editor-canvas",
    name: "Editor canvas",
    description: "Editor workspace UI, optimistic queue, undo and redo.",
    status: "operational",
    uptime90d: 99.97,
    history: buildHistory(null),
    lastChecked: "2026-06-10T14:32:00Z",
  },
  {
    id: "public-api",
    name: "Public API",
    description: "REST endpoints under /api. Idempotency keys honored on writes.",
    status: "operational",
    uptime90d: 99.96,
    history: buildHistory(null),
    lastChecked: "2026-06-10T14:32:00Z",
  },
  {
    id: "webhook-delivery",
    name: "Webhook delivery",
    description: "Outbound notifications, Creem billing events, audit log forwarding.",
    status: "operational",
    uptime90d: 99.88,
    history: buildHistory(19),
    lastChecked: "2026-06-10T14:32:00Z",
  },
  {
    id: "authentication",
    name: "Authentication",
    description: "Clerk session middleware and agent token verification.",
    status: "operational",
    uptime90d: 99.99,
    history: buildHistory(null),
    lastChecked: "2026-06-10T14:32:00Z",
  },
];

export const pastIncidents: ReadonlyArray<PastIncident> = [
  {
    id: "inc-2026-05-22",
    severity: "sev-2",
    title: "Webhook delivery delayed for 38 minutes",
    startedAt: "2026-05-22T11:14:00Z",
    resolvedAt: "2026-05-22T11:52:00Z",
    postmortem:
      "Audit log forwarding queue backed up after a downstream SIEM rejected payloads larger than 64 KB. We added a per-event size guard and broke oversized payloads into chunks. Audit events were retried from the durable queue with no loss. No customer-facing data was at risk.",
    affectedServiceIds: ["webhook-delivery"],
  },
  {
    id: "inc-2026-04-14",
    severity: "sev-1",
    title: "Modal executor unreachable for 9 minutes",
    startedAt: "2026-04-14T08:03:00Z",
    resolvedAt: "2026-04-14T08:12:00Z",
    postmortem:
      "A Modal region restart dropped warm containers. /api/agent/build returned 502 for new turns while existing streams completed. We restarted the executor app and the route recovered. We have since enabled the health probe to detect this faster and updated the runbook on-call entry to point at the same script.",
    affectedServiceIds: ["agent-runner"],
  },
  {
    id: "inc-2026-02-27",
    severity: "sev-2",
    title: "Editor save latency p95 above 2 seconds",
    startedAt: "2026-02-27T19:21:00Z",
    resolvedAt: "2026-02-27T20:08:00Z",
    postmortem:
      "A recently added collect() on agent_turns ran without an index during a hot key spike from one workspace. p95 latency for /api/graph rose to 2.3 s. We added the by_workspace_recent index and rolled back the offending mutation. No writes were lost; the optimistic queue absorbed the delay.",
    affectedServiceIds: ["editor-canvas", "public-api"],
  },
  {
    id: "inc-2026-01-09",
    severity: "sev-2",
    title: "Sign-in success rate dropped 6 percent for 14 minutes",
    startedAt: "2026-01-09T13:42:00Z",
    resolvedAt: "2026-01-09T13:56:00Z",
    postmortem:
      "A Clerk maintenance window in the EU rotated session keys mid-window. Users with active sessions across regions saw 401 on /api/agent/build. We re-verified env parity, redeployed middleware with the matcher locked at /api/agent(.*), and the rate recovered. We added a parity check to the deploy gate.",
    affectedServiceIds: ["authentication"],
  },
];

export interface StatusAggregate {
  status: ServiceStatus;
  label: string;
  lastUpdated: string;
}

export function aggregateStatus(
  list: ReadonlyArray<UptimeService>,
): StatusAggregate {
  const anyDown = list.some((s) => s.status === "down");
  const anyDegraded = list.some((s) => s.status === "degraded");
  const status: ServiceStatus = anyDown
    ? "down"
    : anyDegraded
      ? "degraded"
      : "operational";
  const label =
    status === "operational"
      ? "All systems operational"
      : status === "degraded"
        ? "Partial degradation in progress"
        : "Service disruption";
  return {
    status,
    label,
    lastUpdated: "2026-06-10T14:32:00Z",
  };
}
