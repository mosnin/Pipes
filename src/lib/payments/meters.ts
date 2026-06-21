// Usage meters — the priced, metered resources x402 can gate per call.
//
// Where marketplace listings are one-time purchases, meters are usage-based:
// each call to a metered endpoint costs `unitPriceUsd * units`. The registry is
// the single source of truth for what a unit of each meter costs.

export type UsageMeter = {
  id: string;
  label: string;
  unitPriceUsd: number;
  description: string;
};

export const USAGE_METERS: Record<string, UsageMeter> = {
  agent_build: {
    id: "agent_build",
    label: "AI loop build",
    unitPriceUsd: 0.05,
    description: "One agent build — one prompt the agent acts on.",
  },
  protocol_call: {
    id: "protocol_call",
    label: "Protocol tool call",
    unitPriceUsd: 0.001,
    description: "One MCP / protocol tool call.",
  },
  schema_export: {
    id: "schema_export",
    label: "Schema export",
    unitPriceUsd: 0.01,
    description: "One looper_schema_v1 export.",
  },
};

export function getMeter(id: string): UsageMeter | undefined {
  return USAGE_METERS[id];
}

// The canonical x402 resource id for a metered charge, e.g. "usage:agent_build".
export function meterResourceId(meterId: string): string {
  return `usage:${meterId}`;
}

// Cost of `units` of a meter, in USD. Unknown meters cost 0 (ungated).
export function usageCost(meterId: string, units: number): number {
  const meter = getMeter(meterId);
  if (!meter) return 0;
  return Math.max(0, units) * meter.unitPriceUsd;
}
