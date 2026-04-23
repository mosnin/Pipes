import type { Plan } from "@/domain/pipes_schema_v1/schema";

export type Entitlements = {
  maxSystems: number;
  collaboration: boolean;
  versionHistory: boolean;
  advancedValidation: boolean;
  simulation: boolean;
  apiMcpAccess: boolean;
  aiGeneration: boolean;
};

const PLAN_ENTITLEMENTS: Record<Plan, Entitlements> = {
  Free: {
    maxSystems: 3,
    collaboration: false,
    versionHistory: false,
    advancedValidation: false,
    simulation: true,
    apiMcpAccess: false,
    aiGeneration: false
  },
  Pro: {
    maxSystems: 25,
    collaboration: true,
    versionHistory: true,
    advancedValidation: true,
    simulation: true,
    apiMcpAccess: true,
    aiGeneration: false
  },
  Builder: {
    maxSystems: 250,
    collaboration: true,
    versionHistory: true,
    advancedValidation: true,
    simulation: true,
    apiMcpAccess: true,
    aiGeneration: true
  }
};

export function getEntitlements(plan: Plan): Entitlements {
  return PLAN_ENTITLEMENTS[plan];
}
