import { env, runtimeFlags } from "@/lib/env";

export function getAdminAllowlist() {
  const configured = String(env.LOOPER_ADMIN_ALLOWLIST ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (configured.length > 0) return configured;
  // The mock owner is auto-admin ONLY in non-production (local dev / the demo
  // preview convenience). Never grant platform-admin to the fixed mock identity
  // in production — a misconfigured deploy that leaves mocks on must not hand
  // every visitor the admin console. Set LOOPER_ADMIN_ALLOWLIST explicitly.
  if (runtimeFlags.useMocks && process.env.NODE_ENV !== "production") return ["owner@pipes.local"];
  return [];
}

export function canAccessAdmin(email?: string | null) {
  if (!email) return false;
  return getAdminAllowlist().includes(email.toLowerCase());
}
