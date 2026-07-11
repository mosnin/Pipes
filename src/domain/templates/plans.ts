import type { Plan } from "@/domain/looper_schema_v1/schema";

export type Entitlements = {
  maxSystems: number;
  // Loop-specific gates (Pipes product)
  maxPublicLoops: number;
  privateLoops: boolean;
  marketplaceSelling: boolean;
  mcpReadWrite: boolean;
  loopAnalytics: boolean;
  // Collaboration & ops
  collaboration: boolean;
  versionHistory: boolean;
  advancedValidation: boolean;
  simulation: boolean;
  apiMcpAccess: boolean;
  aiGeneration: boolean;
  // Team & compliance
  sso: boolean;
  auditLog: boolean;
  privateRegistry: boolean;
};

const PLAN_ENTITLEMENTS: Record<Plan, Entitlements> = {
  Free: {
    maxSystems: 3,
    maxPublicLoops: 3,
    privateLoops: false,
    marketplaceSelling: false,
    mcpReadWrite: false,
    loopAnalytics: false,
    collaboration: false,
    versionHistory: false,
    advancedValidation: false,
    simulation: true,
    apiMcpAccess: false,
    aiGeneration: false,
    sso: false,
    auditLog: false,
    privateRegistry: false,
  },
  Pro: {
    maxSystems: 100,
    maxPublicLoops: -1, // unlimited
    privateLoops: true,
    marketplaceSelling: true,
    mcpReadWrite: true,
    loopAnalytics: true,
    collaboration: true,
    versionHistory: true,
    advancedValidation: true,
    simulation: true,
    apiMcpAccess: true,
    aiGeneration: true,
    sso: false,
    auditLog: false,
    privateRegistry: false,
  },
  Team: {
    maxSystems: 500,
    maxPublicLoops: -1,
    privateLoops: true,
    marketplaceSelling: true,
    mcpReadWrite: true,
    loopAnalytics: true,
    collaboration: true,
    versionHistory: true,
    advancedValidation: true,
    simulation: true,
    apiMcpAccess: true,
    aiGeneration: true,
    sso: true,
    auditLog: true,
    privateRegistry: true,
  },
  Enterprise: {
    maxSystems: -1, // unlimited
    maxPublicLoops: -1,
    privateLoops: true,
    marketplaceSelling: true,
    mcpReadWrite: true,
    loopAnalytics: true,
    collaboration: true,
    versionHistory: true,
    advancedValidation: true,
    simulation: true,
    apiMcpAccess: true,
    aiGeneration: true,
    sso: true,
    auditLog: true,
    privateRegistry: true,
  },
  // Legacy Builder plan: maps to Team-level entitlements
  Builder: {
    maxSystems: 250,
    maxPublicLoops: -1,
    privateLoops: true,
    marketplaceSelling: true,
    mcpReadWrite: true,
    loopAnalytics: true,
    collaboration: true,
    versionHistory: true,
    advancedValidation: true,
    simulation: true,
    apiMcpAccess: true,
    aiGeneration: true,
    sso: false,
    auditLog: false,
    privateRegistry: false,
  },
};

export function getEntitlements(plan: Plan): Entitlements {
  return PLAN_ENTITLEMENTS[plan];
}
