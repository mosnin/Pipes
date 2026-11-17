/**
 * Live rails: kill switches and per-token limits. Read at the moment of each
 * action, never frozen into a run, so turning runs off takes effect at once.
 */
import { DEFAULT_RAIL_SETTINGS, PLATFORM_CALLS_PER_MINUTE, type KillSwitch, type KillSwitchMode, type RailSettings } from "@/domain/rails/types";
import type { RepositorySet } from "@/lib/repositories/contracts";

export const SWITCH_KIND = "rail_switch";
export const SETTINGS_KIND = "rail_settings";

const switchId = (scope: KillSwitch["scope"], targetId: string) => `${scope === "workspace" ? "ws" : "sys"}:${targetId}`;

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
}

export function sanitizeRailSettings(input: unknown): RailSettings {
  const limits = (input as RailSettings | undefined)?.tokenLimits ?? DEFAULT_RAIL_SETTINGS.tokenLimits;
  const d = DEFAULT_RAIL_SETTINGS.tokenLimits;
  return {
    tokenLimits: {
      perMinute: clampInt(limits.perMinute, 1, PLATFORM_CALLS_PER_MINUTE, d.perMinute),
      writesPerMinute: clampInt(limits.writesPerMinute, 1, PLATFORM_CALLS_PER_MINUTE, d.writesPerMinute),
      startsPerHour: clampInt(limits.startsPerHour, 1, 100_000, d.startsPerHour)
    }
  };
}

export function createSwitchService(repos: RepositorySet) {
  return {
    /** The workspace switch and the workflow's switch, whichever exist. */
    async forWorkflow(workspaceId: string, systemId?: string): Promise<KillSwitch[]> {
      const ids = [switchId("workspace", workspaceId), ...(systemId ? [switchId("workflow", systemId)] : [])];
      const docs = await Promise.all(ids.map((id) => repos.documents.get<KillSwitch>(SWITCH_KIND, id)));
      return docs.filter((d) => d && d.workspaceId === workspaceId).map((d) => d!.data);
    },

    async list(workspaceId: string): Promise<KillSwitch[]> {
      const docs = await repos.documents.list<KillSwitch>(SWITCH_KIND, { workspaceId });
      return docs.map((d) => d.data);
    },

    async set(workspaceId: string, input: { scope: KillSwitch["scope"]; targetId: string; mode: KillSwitchMode; reason?: string; setBy: string }): Promise<KillSwitch> {
      const value: KillSwitch = {
        scope: input.scope,
        targetId: input.scope === "workspace" ? workspaceId : input.targetId,
        mode: input.mode,
        reason: input.reason?.trim().slice(0, 300) || undefined,
        setBy: input.setBy,
        setAt: new Date().toISOString()
      };
      await repos.documents.put<KillSwitch>({ kind: SWITCH_KIND, id: switchId(value.scope, value.targetId), workspaceId, refId: value.targetId, data: value });
      return value;
    },

    async settings(workspaceId: string): Promise<RailSettings> {
      const doc = await repos.documents.get<RailSettings>(SETTINGS_KIND, workspaceId);
      return sanitizeRailSettings(doc?.data);
    },

    async saveSettings(workspaceId: string, input: unknown): Promise<RailSettings> {
      const value = sanitizeRailSettings(input);
      await repos.documents.put<RailSettings>({ kind: SETTINGS_KIND, id: workspaceId, workspaceId, data: value });
      return value;
    }
  };
}

export type SwitchService = ReturnType<typeof createSwitchService>;
