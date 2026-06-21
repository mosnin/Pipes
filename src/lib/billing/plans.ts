// Single source of truth for plan pricing and features.
// Imported by both the marketing pricing page and the billing settings page.

export type PlanTier = "Free" | "Pro" | "Builder" | "Enterprise";

export const PLAN_PRICING: Record<"Pro" | "Builder", { monthlyUsd: number; displayPrice: string }> = {
  Pro:     { monthlyUsd: 29,  displayPrice: "$29" },
  Builder: { monthlyUsd: 99,  displayPrice: "$99" },
};

export const PLAN_FEATURES: Record<"Pro" | "Builder", string[]> = {
  Pro: [
    "Up to 20 systems",
    "Private loops",
    "Team collaboration",
    "Version history",
    "API & MCP access",
    "Marketplace selling",
  ],
  Builder: [
    "Unlimited systems",
    "Private loops",
    "Team collaboration",
    "Version history",
    "AI generation",
    "API & MCP access",
    "Marketplace selling",
    "Priority support",
  ],
};
