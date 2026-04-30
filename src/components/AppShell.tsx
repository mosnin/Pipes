import { getAuthService } from "@/lib/auth";
import { getServerApp } from "@/lib/composition/server";
import { canAccessAdmin } from "@/lib/admin/access";
import { AppShellClient } from "./AppShellClient";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
}

function deriveWorkspaceName(workspaceId: string): string {
  // Convex IDs and synthetic IDs are not user-friendly. Show a stable short label.
  if (workspaceId.length === 0) return "Workspace";
  if (workspaceId.length <= 12) return workspaceId;
  return "Workspace";
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getAuthService().requireUser();
  const { ctx } = await getServerApp();
  const showAdmin = canAccessAdmin(user.email);
  const initials = getInitials(user.name);

  return (
    <AppShellClient
      user={{
        name: user.name,
        email: user.email,
        initials,
      }}
      workspace={{
        id: ctx.workspaceId,
        name: deriveWorkspaceName(ctx.workspaceId),
        plan: ctx.plan,
        role: ctx.role,
      }}
      showAdmin={showAdmin}
    >
      {children}
    </AppShellClient>
  );
}
