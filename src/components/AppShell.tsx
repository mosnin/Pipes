import { ClientAppShell } from "@/components/shell/app-shell";
import { canAccessAdmin } from "@/lib/admin/access";
import { getServerApp } from "@/lib/composition/server";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { identity, ctx } = await getServerApp();
  return (
    <ClientAppShell
      user={{ name: identity.name, email: identity.email }}
      workspaceLabel={`${identity.name.split(" ")[0]}'s workspace`}
      plan={String(ctx.plan)}
      isAdmin={canAccessAdmin(identity.email)}
    >
      {children}
    </ClientAppShell>
  );
}
