import { AppShell } from "@/components/AppShell";
import { getServerApp } from "@/lib/composition/server";

export default async function InternalAppLayout({ children }: { children: React.ReactNode }) {
  await getServerApp();
  return <AppShell>{children}</AppShell>;
}
