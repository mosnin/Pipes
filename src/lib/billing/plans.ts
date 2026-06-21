// Single source of truth for plan pricing and features.
// Imported by both the marketing pricing page and the billing settings page.

export type PlanTier = "Free" | "Pro" | "Builder" | "Enterprise";

// Internal key is "Builder" (legacy); display name shown to users is "Team".
export const PLAN_DISPLAY_NAME: Record<"Pro" | "Builder", string> = {
  Pro:     "Pro",
  Builder: "Team",
};

export const PLAN_PRICING: Record<"Pro" | "Builder", { monthlyUsd: number; displayPrice: string }> = {
  Pro:     { monthlyUsd: 29,  displayPrice: "$29" },
  Builder: { monthlyUsd: 99,  displayPrice: "$99" },
};

export const PLAN_FEATURES: Record<"Pro" | "Builder", string[]> = {
  Pro: [
    "Up to 100 systems",
    "Private loops",
    "AI-assisted builds",
    "Team collaboration",
    "Version history",
    "API & MCP access",
    "Marketplace selling",
  ],
  Builder: [
    "Unlimited systems",
    "Private loops",
    "AI-assisted builds",
    "Team collaboration (up to 10 seats)",
    "Version history",
    "API & MCP access",
    "Marketplace selling",
    "SSO (SAML)",
    "Audit log",
    "Priority support",
  ],
};
