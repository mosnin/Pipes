import { env, runtimeFlags } from "@/lib/env";

export function getAdminAllowlist() {
  const configured = String(env.PIPES_ADMIN_ALLOWLIST ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (configured.length > 0) return configured;
  if (runtimeFlags.useMocks) return ["owner@pipes.local"];
  return [];
}

export function canAccessAdmin(email?: string | null) {
  if (!email) return false;
  return getAdminAllowlist().includes(email.toLowerCase());
}
