import type { SignalRole } from "@/components/ledger/status";
import type { Actor, RouteKind, RunStatus, WorkflowRun } from "@/domain/runs/types";
import type { RunSummary } from "@/domain/runs/service";

export type { RunSummary };

/** What every runs route answers with. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error?: string; message: string };

/** Fetch a runs route and normalise any failure into a sentence the page can show. */
export async function callApi<T>(url: string, init?: { method?: string; body?: unknown }): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store"
    });
    const json = await res.json().catch(() => null);
    if (json && json.ok === true) return { ok: true, data: json.data as T };
    const message =
      typeof json?.message === "string"
        ? json.message
        : typeof json?.error?.message === "string"
          ? json.error.message
          : typeof json?.error === "string"
            ? json.error
            : `The request failed with status ${res.status}.`;
    return { ok: false, error: typeof json?.error === "string" ? json.error : undefined, message };
  } catch {
    return { ok: false, message: "Pipes could not be reached. Check your connection and try again." };
  }
}

export const STATUS_LABEL: Record<RunStatus, string> = {
  running: "Running",
  waiting_approval: "Waiting for approval",
  completed: "Completed",
  failed: "Failed",
  canceled: "Canceled"
};

export const STATUS_ROLE: Record<RunStatus, SignalRole> = {
  running: "info",
  waiting_approval: "caution",
  completed: "positive",
  failed: "critical",
  canceled: "neutral"
};

export const TRIGGER_LABEL: Record<WorkflowRun["trigger"], string> = {
  manual: "Manual",
  api: "API",
  mcp: "MCP",
  webhook: "Webhook",
  schedule: "Schedule"
};

export const ROUTE_LABEL: Record<RouteKind, string> = {
  default: "Continue",
  success: "Success",
  failure: "Failure",
  conditional: "Condition met",
  loop: "Loop again"
};

export function isActive(status: RunStatus) {
  return status === "running" || status === "waiting_approval";
}

export function actorName(actor?: Actor): string {
  if (!actor) return "Unknown";
  if (actor.label) return actor.label;
  if (actor.type === "agent") return "An agent";
  if (actor.type === "trigger") return "A trigger";
  return actor.id;
}

export function actorKind(actor?: Actor): string {
  if (!actor) return "";
  return actor.type === "agent" ? "Agent" : actor.type === "trigger" ? "Trigger" : "Person";
}

/** 4s, 2m 10s, 3h 05m, 2d 4h. Durations are facts, so they never round to "a while". */
export function formatDuration(ms: number | undefined | null): string | null {
  if (ms === undefined || ms === null || !Number.isFinite(ms) || ms < 0) return null;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 1) return "Under 1s";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

const STAMP = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });

/** Nov 16, 2:04:31 PM: the exact time, for a step record. */
export function formatStamp(iso: string | undefined): string | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  return Number.isFinite(at) ? STAMP.format(at) : null;
}

const CLOCK = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });

/** 2:05:10 PM: the second half of a range that starts the same day. */
export function formatClock(iso: string | undefined): string | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  return Number.isFinite(at) ? CLOCK.format(at) : null;
}

export function sameDay(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function ts(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const at = Date.parse(iso);
  return Number.isFinite(at) ? at : undefined;
}

/** Outcome of a step record as a role and a sentence-case label. */
export function outcomeView(outcome: string | undefined): { role: SignalRole; label: string } {
  const value = (outcome ?? "").trim();
  const lower = value.toLowerCase();
  if (lower === "success") return { role: "positive", label: "Succeeded" };
  if (lower === "approved") return { role: "positive", label: "Approved" };
  if (["failure", "failed", "error"].includes(lower)) return { role: "critical", label: "Failed" };
  if (lower === "rejected") return { role: "critical", label: "Rejected" };
  if (lower === "sent_back") return { role: "caution", label: "Sent back" };
  return { role: "neutral", label: value ? value.charAt(0).toUpperCase() + value.slice(1) : "Done" };
}

/** Node types arrive as PascalCase identifiers: HumanApproval reads as "Human approval". */
export function nodeTypeLabel(type: string): string {
  const spaced = type.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Output as the performer would want to read it back: JSON pretty-printed, text as is. */
export function formatOutput(output: unknown): string | null {
  if (output === undefined || output === null || output === "") return null;
  if (typeof output === "string") return output;
  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}

/** A textarea's contents: JSON when it parses as an object or array, otherwise the text. */
export function parseOutput(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

/** Run time so far: the recorded duration once finished, elapsed time while live. */
export function runDuration(run: { startedAt: string; endedAt?: string; durationMs?: number }, now: number | null): number | undefined {
  if (typeof run.durationMs === "number") return run.durationMs;
  const start = ts(run.startedAt);
  const end = ts(run.endedAt);
  if (start === undefined) return undefined;
  if (end !== undefined) return end - start;
  return now ? Math.max(0, now - start) : undefined;
}
