import { Breadcrumbs, PageHeader } from "@/components/ui";
import { BuildClient } from "@/components/build/BuildClient";
import { getServerApp } from "@/lib/composition/server";

export const metadata = {
  title: "Workflow Builder — Pipes",
  description: "Describe a goal. Agents plan and build the optimal DAG workflow — no human graph-drawing required.",
};

export default async function BuildPage() {
  await getServerApp();

  return (
    <div className="surface-subtle min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Breadcrumbs items={[{ label: "Workspace" }, { label: "Workflow Builder" }]} />
        <div className="mt-3 mb-8">
          <PageHeader
            title="Workflow Builder"
            subtitle="Describe a goal in plain language. The AI plans the optimal DAG — with parallel branches, checkpoints, and agent hand-offs — so you never draw a graph by hand."
          />
        </div>
        <BuildClient />
      </div>
    </div>
  );
}
