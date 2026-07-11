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

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getAuthService().requireUser();
  const { ctx, repositories } = await getServerApp();
  const showAdmin = canAccessAdmin(user.email);
  const initials = getInitials(user.name);
  const workspace = await repositories.workspaces.get(ctx.workspaceId);

  return (
    <AppShellClient
      user={{
        name: user.name,
        email: user.email,
        initials,
      }}
      workspace={{
        id: ctx.workspaceId,
        name: workspace?.name ?? "Workspace",
        plan: ctx.plan,
        role: ctx.role,
      }}
      showAdmin={showAdmin}
    >
      {children}
    </AppShellClient>
  );
}
