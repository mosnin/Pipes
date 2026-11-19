import crypto from "node:crypto";
import { describeCronError, nextFireBetween } from "@/domain/triggers/cron";
import type { WorkflowRun } from "@/domain/runs/types";
import type { RepositorySet } from "@/lib/repositories/contracts";

export const TRIGGERS_KIND = "system_triggers";

export type ScheduleEntry = { id: string; cron: string; enabled: boolean; label?: string; input?: unknown; lastFiredAt?: string; createdAt: string };

export type SystemTriggers = {
  systemId: string;
  /** Inbound: POST /api/hooks/{systemId} with this key starts a run. Stored as a hash; shown once. */
  webhookKeyHash?: string;
  webhookKeyPreview?: string;
  webhookEnabled: boolean;
  schedules: ScheduleEntry[];
  /** Outbound: Pipes POSTs run events here, signed with HMAC-SHA256. */
  outboundUrl?: string;
  outboundSecret?: string;
  outboundEvents: string[];
};

export const OUTBOUND_EVENTS = ["run.started", "run.completed", "run.failed", "run.canceled", "approval.requested"] as const;

const hashKey = (key: string) => crypto.createHash("sha256").update(key).digest("hex");

export function signPayload(secret: string, body: string, timestamp: string): string {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

function isSafeOutboundUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:")) return false;
    const host = url.hostname;
    if (process.env.NODE_ENV === "production" && (host === "localhost" || host.endsWith(".local") || /^(127|10|192\.168|169\.254)\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host))) return false;
    return true;
  } catch {
    return false;
  }
}

export function createTriggerService(repos: RepositorySet) {
  async function read(systemId: string): Promise<SystemTriggers> {
    const doc = await repos.documents.get<SystemTriggers>(TRIGGERS_KIND, systemId);
    return doc?.data ?? { systemId, webhookEnabled: false, schedules: [], outboundEvents: [...OUTBOUND_EVENTS] };
  }
  async function write(workspaceId: string, data: SystemTriggers) {
    await repos.documents.put<SystemTriggers>({ kind: TRIGGERS_KIND, id: data.systemId, workspaceId, refId: data.systemId, data });
    return data;
  }

  return {
    read,

    /** Public view: never includes key hashes or the outbound secret. */
    async view(systemId: string) {
      const t = await read(systemId);
      return {
        webhookEnabled: t.webhookEnabled,
        webhookKeyPreview: t.webhookKeyPreview,
        schedules: t.schedules,
        outboundUrl: t.outboundUrl,
        outboundConfigured: Boolean(t.outboundUrl && t.outboundSecret),
        outboundEvents: t.outboundEvents
      };
    },

    /** Creates or rotates the inbound webhook key. Returns the key once. */
    async rotateWebhookKey(workspaceId: string, systemId: string): Promise<string> {
      const t = await read(systemId);
      const key = `pwh_${crypto.randomBytes(24).toString("base64url")}`;
      await write(workspaceId, { ...t, webhookEnabled: true, webhookKeyHash: hashKey(key), webhookKeyPreview: `${key.slice(0, 8)}…${key.slice(-4)}` });
      return key;
    },

    async setWebhookEnabled(workspaceId: string, systemId: string, enabled: boolean) {
      const t = await read(systemId);
      return write(workspaceId, { ...t, webhookEnabled: enabled && Boolean(t.webhookKeyHash) });
    },

    async verifyWebhookKey(systemId: string, key: string | null): Promise<boolean> {
      if (!key) return false;
      const t = await read(systemId);
      if (!t.webhookEnabled || !t.webhookKeyHash) return false;
      const a = Buffer.from(hashKey(key));
      const b = Buffer.from(t.webhookKeyHash);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    },

    async addSchedule(workspaceId: string, systemId: string, input: { cron: string; label?: string; input?: unknown }) {
      const error = describeCronError(input.cron);
      if (error) throw new Error(error);
      const t = await read(systemId);
      if (t.schedules.length >= 10) throw new Error("A workflow can have at most 10 schedules.");
      const entry: ScheduleEntry = { id: `sch_${crypto.randomUUID().slice(0, 8)}`, cron: input.cron.trim(), label: input.label?.trim() || undefined, input: input.input, enabled: true, createdAt: new Date().toISOString(), lastFiredAt: new Date().toISOString() };
      await write(workspaceId, { ...t, schedules: [...t.schedules, entry] });
      return entry;
    },

    async updateSchedule(workspaceId: string, systemId: string, scheduleId: string, patch: { enabled?: boolean }) {
      const t = await read(systemId);
      return write(workspaceId, { ...t, schedules: t.schedules.map((s) => (s.id === scheduleId ? { ...s, ...patch } : s)) });
    },

    async removeSchedule(workspaceId: string, systemId: string, scheduleId: string) {
      const t = await read(systemId);
      return write(workspaceId, { ...t, schedules: t.schedules.filter((s) => s.id !== scheduleId) });
    },

    async setOutbound(workspaceId: string, systemId: string, input: { url?: string; events?: string[] }): Promise<{ secret?: string }> {
      const t = await read(systemId);
      if (!input.url) {
        await write(workspaceId, { ...t, outboundUrl: undefined, outboundSecret: undefined });
        return {};
      }
      if (!isSafeOutboundUrl(input.url)) throw new Error("Use a public https URL for outbound events.");
      const secret = t.outboundUrl === input.url && t.outboundSecret ? t.outboundSecret : `pws_${crypto.randomBytes(24).toString("base64url")}`;
      const events = (input.events ?? t.outboundEvents).filter((e) => (OUTBOUND_EVENTS as readonly string[]).includes(e));
      await write(workspaceId, { ...t, outboundUrl: input.url, outboundSecret: secret, outboundEvents: events });
      return { secret: t.outboundSecret === secret ? undefined : secret };
    },

    /** Deliver a run event to the system's outbound URL, if one is configured. Best effort, 5s timeout. */
    async deliver(event: string, run: WorkflowRun): Promise<void> {
      const t = await read(run.systemId);
      if (!t.outboundUrl || !t.outboundSecret || !t.outboundEvents.includes(event)) return;
      const body = JSON.stringify({
        event,
        runId: run.id,
        systemId: run.systemId,
        systemName: run.systemName,
        status: run.status,
        currentNodeId: run.currentNodeId,
        currentStepTitle: run.currentNodeId ? run.snapshot.nodes.find((n) => n.id === run.currentNodeId)?.title : undefined,
        at: new Date().toISOString()
      });
      const timestamp = String(Math.floor(Date.now() / 1000));
      await fetch(t.outboundUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "x-pipes-event": event, "x-pipes-timestamp": timestamp, "x-pipes-signature": `sha256=${signPayload(t.outboundSecret, body, timestamp)}` },
        body,
        signal: AbortSignal.timeout(5000)
      }).catch(() => undefined);
    },

    /** Schedules due between their last fire and `now`. Marks them fired. */
    async collectDue(now = new Date()): Promise<Array<{ workspaceId: string; systemId: string; schedule: ScheduleEntry }>> {
      const docs = await repos.documents.list<SystemTriggers>(TRIGGERS_KIND, {});
      const due: Array<{ workspaceId: string; systemId: string; schedule: ScheduleEntry }> = [];
      for (const doc of docs) {
        let changed = false;
        const schedules = doc.data.schedules.map((s) => {
          if (!s.enabled) return s;
          const after = new Date(s.lastFiredAt ?? s.createdAt);
          const fire = nextFireBetween(s.cron, after, now);
          if (!fire) return s;
          changed = true;
          due.push({ workspaceId: doc.workspaceId, systemId: doc.data.systemId, schedule: s });
          return { ...s, lastFiredAt: now.toISOString() };
        });
        if (changed) await write(doc.workspaceId, { ...doc.data, schedules });
      }
      return due;
    }
  };
}

export type TriggerService = ReturnType<typeof createTriggerService>;
