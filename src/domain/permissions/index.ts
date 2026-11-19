import type { Role } from "@/domain/pipes_schema_v1/schema";

/**
 * Pipes' role-based access control. One table says what each role may do;
 * every check in the app reads from it, through `can` or `assertCan`.
 * See docs/rbac.md, which mirrors this table, and tests/unit/rbac.test.ts,
 * which fails if the two drift.
 *
 * Roles are cumulative: each role holds everything the role below it holds.
 * Agent tokens act with their creator's role capped at Editor, and then only
 * within the capabilities granted to the token.
 */

export const ROLES: Role[] = ["Viewer", "Commenter", "Editor", "Admin", "Owner"];

export const ROLE_RANK: Record<Role, number> = { Viewer: 1, Commenter: 2, Editor: 3, Admin: 4, Owner: 5 };

export const PERMISSIONS = {
  "workflows.view": { min: "Viewer", label: "See workflows, runs and their history" },
  "comments.write": { min: "Commenter", label: "Comment on workflows" },
  "workflows.edit": { min: "Editor", label: "Create, edit, version, archive and restore workflows, triggers and memory" },
  "runs.operate": { min: "Editor", label: "Start runs, complete steps and cancel runs" },
  "connections.manage": { min: "Editor", label: "Add and change connections (stored secrets are never shown)" },
  "members.manage": { min: "Admin", label: "Invite people, change roles below Admin, and remove members" },
  "tokens.manage": { min: "Admin", label: "Create and revoke API tokens" },
  "audit.view": { min: "Admin", label: "Read the audit log and security activity" },
  "rails.manage": { min: "Admin", label: "Stop runs with kill switches and set token limits" },
  "security.manage": { min: "Admin", label: "Set sign-in policies: two-step sign-in, session length, allowed email domains" },
  "feedback.manage": { min: "Admin", label: "Triage feedback" },
  "billing.manage": { min: "Owner", label: "Change the plan and billing details" },
  "admins.manage": { min: "Owner", label: "Make, demote and remove Admins" },
  "ownership.transfer": { min: "Owner", label: "Hand the workspace to another member" },
  "workspace.deactivate": { min: "Owner", label: "Deactivate or reactivate the workspace" }
} as const satisfies Record<string, { min: Role; label: string }>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role || !(role in ROLE_RANK)) return false;
  return ROLE_RANK[role] >= ROLE_RANK[PERMISSIONS[permission].min];
}

/** Every permission a role holds, in table order. */
export function permissionsFor(role: Role): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((p) => can(role, p));
}

export class AccessDenied extends Error {
  readonly code = "not_allowed";
  constructor(
    public readonly permission: Permission,
    message?: string
  ) {
    super(message ?? `You need the ${PERMISSIONS[permission].min} role or higher to ${PERMISSIONS[permission].label.charAt(0).toLowerCase()}${PERMISSIONS[permission].label.slice(1)}.`);
  }
}

/** Throws `AccessDenied` (HTTP 403, code not_allowed) unless the role holds the permission. */
export function assertCan(ctx: { role: Role }, permission: Permission): void {
  if (!can(ctx.role, permission)) throw new AccessDenied(permission);
}

/**
 * Which roles an actor may hand out. Admins manage everyone below Admin;
 * Owners also manage Admins. Owner is never assigned here: it moves only by
 * transfer, so a workspace always has exactly one.
 */
export function assignableRoles(actor: Role): Role[] {
  if (actor === "Owner") return ["Admin", "Editor", "Commenter", "Viewer"];
  if (actor === "Admin") return ["Editor", "Commenter", "Viewer"];
  return [];
}

/**
 * Whether `actor` may change or remove a member who holds `target`, giving
 * them `next` (omit for removal). Returns the reason when not.
 */
export function roleChangeProblem(input: { actor: Role; actorId: string; targetId: string; target: Role; next?: Role }): string | null {
  const { actor, target, next } = input;
  if (input.actorId === input.targetId) return "You cannot change your own role or remove yourself. Ask another Admin or the Owner.";
  if (target === "Owner") return "The Owner cannot be changed or removed. The Owner can hand the workspace to someone else.";
  if (!can(actor, "members.manage")) return "You need the Admin role or higher to manage members.";
  if (target === "Admin" && !can(actor, "admins.manage")) return "Only the Owner can change or remove an Admin.";
  if (next !== undefined && !assignableRoles(actor).includes(next)) return next === "Owner" ? "Use transfer ownership to make someone the Owner." : `You cannot give the ${next} role.`;
  return null;
}

// Named checks kept for existing callers; each is one row of the table.
export const canViewSystem = (role: Role) => can(role, "workflows.view");
export const canEditSystem = (role: Role) => can(role, "workflows.edit");
export const canComment = (role: Role) => can(role, "comments.write");
export const canManageMembers = (role: Role) => can(role, "members.manage");
export const canExportSchema = (role: Role) => can(role, "workflows.edit");
export const canUseAiFeatures = (role: Role) => can(role, "workflows.edit");
