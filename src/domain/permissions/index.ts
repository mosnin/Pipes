import type { Role } from "@/domain/pipes_schema_v1/schema";

const roleRank: Record<Role, number> = {
  Viewer: 1,
  Commenter: 2,
  Editor: 3,
  Admin: 4,
  Owner: 5
};

const minRole = (role: Role, required: Role) => roleRank[role] >= roleRank[required];

export const canViewSystem = (role: Role) => minRole(role, "Viewer");
export const canEditSystem = (role: Role) => minRole(role, "Editor");
export const canComment = (role: Role) => minRole(role, "Commenter");
export const canManageMembers = (role: Role) => minRole(role, "Admin");
export const canExportSchema = (role: Role) => minRole(role, "Editor");
export const canUseAiFeatures = (role: Role) => minRole(role, "Editor");
