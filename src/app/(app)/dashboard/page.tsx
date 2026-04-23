import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getServerApp } from "@/lib/composition/server";

export default async function DashboardPage() {
  const { ctx, services } = await getServerApp();
  const library = await services.library.query(ctx, { status: "active", sort: "recent_activity" });
  return <DashboardClient initialLibrary={library} />;
}
