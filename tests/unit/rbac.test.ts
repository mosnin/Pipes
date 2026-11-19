import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AccessDenied, assertCan, assignableRoles, can, PERMISSIONS, permissionsFor, ROLES, roleChangeProblem, type Permission } from "@/domain/permissions";

describe("role-based access", () => {
  it("is cumulative: each role holds everything the role below it holds", () => {
    for (let i = 1; i < ROLES.length; i++) {
      const below = new Set(permissionsFor(ROLES[i - 1]));
      for (const p of below) expect(can(ROLES[i], p), `${ROLES[i]} should hold ${p}`).toBe(true);
    }
  });

  it("gives the expected roles the sensitive permissions", () => {
    const cases: Array<[Permission, string]> = [
      ["workflows.view", "Viewer"],
      ["comments.write", "Commenter"],
      ["runs.operate", "Editor"],
      ["members.manage", "Admin"],
      ["security.manage", "Admin"],
      ["billing.manage", "Owner"],
      ["ownership.transfer", "Owner"]
    ];
    for (const [permission, min] of cases) expect(PERMISSIONS[permission].min).toBe(min);
    expect(can("Editor", "members.manage")).toBe(false);
    expect(can("Admin", "billing.manage")).toBe(false);
    expect(can(undefined, "workflows.view")).toBe(false);
    expect(can("Superuser" as never, "workflows.view")).toBe(false);
  });

  it("refuses with a 403-shaped error that names the role needed", () => {
    expect(() => assertCan({ role: "Viewer" }, "runs.operate")).toThrow(AccessDenied);
    try {
      assertCan({ role: "Commenter" }, "workflows.edit");
    } catch (error) {
      expect((error as AccessDenied).code).toBe("not_allowed");
      expect((error as Error).message).toContain("Editor role or higher");
    }
  });

  it("lets nobody hand out a role above their own, and nobody hand out Owner", () => {
    expect(assignableRoles("Owner")).not.toContain("Owner");
    expect(assignableRoles("Admin")).toEqual(["Editor", "Commenter", "Viewer"]);
    expect(assignableRoles("Editor")).toEqual([]);
  });

  it("protects the Owner, Admins and yourself", () => {
    const base = { actorId: "a", targetId: "b" };
    expect(roleChangeProblem({ ...base, actor: "Admin", target: "Owner", next: "Viewer" })).toMatch(/Owner cannot/);
    expect(roleChangeProblem({ ...base, actor: "Admin", target: "Admin", next: "Viewer" })).toMatch(/Only the Owner/);
    expect(roleChangeProblem({ ...base, actor: "Admin", target: "Editor", next: "Admin" })).toMatch(/cannot give the Admin/);
    expect(roleChangeProblem({ ...base, actor: "Admin", target: "Editor", next: "Owner" })).toMatch(/transfer ownership/);
    expect(roleChangeProblem({ actor: "Admin", actorId: "a", targetId: "a", target: "Admin", next: "Viewer" })).toMatch(/your own role/);
    expect(roleChangeProblem({ ...base, actor: "Editor", target: "Viewer", next: "Commenter" })).toMatch(/Admin role or higher/);
    expect(roleChangeProblem({ ...base, actor: "Admin", target: "Editor", next: "Viewer" })).toBeNull();
    expect(roleChangeProblem({ ...base, actor: "Owner", target: "Admin" })).toBeNull();
  });

  it("matches the table in docs/rbac.md", () => {
    const doc = readFileSync(path.join(process.cwd(), "docs", "rbac.md"), "utf8");
    for (const [permission, { min }] of Object.entries(PERMISSIONS)) {
      expect(doc, `docs/rbac.md is missing ${permission}`).toMatch(new RegExp(`\\| \`${permission.replace(".", "\\.")}\` \\| ${min} \\|`));
    }
  });
});
