import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { getServerApp } from "@/lib/composition/server";
import { Breadcrumbs, PageHeader } from "@/components/ui";

export default async function DashboardPage() {
  const { ctx, services } = await getServerApp();
  const library = await services.library.query(ctx, {
    status: "active",
    sort: "recent_activity",
  });

  return (
    <div className="surface-subtle min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Breadcrumbs items={[{ label: "Workspace" }, { label: "Dashboard" }]} />
        <div className="mt-3">
          <PageHeader
            title="Dashboard"
            subtitle="Your systems, organized. Build, validate, and ship to agents."
          />
        </div>
        <DashboardClient initialLibrary={library} />
      </div>
    </div>
  );
}
