import { AppShell } from "@/components/AppShell";
import { getServerApp } from "@/lib/composition/server";

// Every page behind sign-in depends on who is asking. Never prerender them at build time,
// or the build-time auth result (and data) gets served to every visitor.
export const dynamic = "force-dynamic";

export default async function InternalAppLayout({ children }: { children: React.ReactNode }) {
  await getServerApp();
  return <AppShell>{children}</AppShell>;
}
