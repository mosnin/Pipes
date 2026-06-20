// SIEM webhook forwarder. Fire-and-forget HTTP POST to SIEM_WEBHOOK_URL when
// set. Optional HMAC signature header when SIEM_WEBHOOK_SECRET is set.
//
// The 5 s timeout bounds the worst case; a slow SIEM never holds the request.
// All failures are swallowed; the in-app audit log is the source of truth.

import crypto from "node:crypto";

export type AuditEventOutcome = "success" | "failure";

export type AuditEvent = {
  kind: string;
  actor: { type: "user" | "agent" | "anonymous"; id: string };
  action: string;
  resource: { type: string; id?: string };
  outcome: AuditEventOutcome;
  metadata?: Record<string, unknown>;
  ts: string;
};

const TIMEOUT_MS = 5_000;

function sign(body: string, secret: string): string {
  const h = crypto.createHmac("sha256", secret);
  h.update(body);
  return `sha256=${h.digest("hex")}`;
}

export function forwardAuditEvent(event: AuditEvent): void {
  const url = process.env.SIEM_WEBHOOK_URL;
  if (!url) return;
  const secret = process.env.SIEM_WEBHOOK_SECRET;
  void (async () => {
    try {
      const body = JSON.stringify(event);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (secret) headers["X-Looper-Signature"] = sign(body, secret);
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
      try {
        await fetch(url, { method: "POST", headers, body, signal: ac.signal });
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // SIEM forwarding is best-effort; never throw.
    }
  })();
}

export function buildAuditEvent(input: Omit<AuditEvent, "ts"> & { ts?: string }): AuditEvent {
  return { ...input, ts: input.ts ?? new Date().toISOString() };
}
