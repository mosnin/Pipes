import { Breadcrumbs, PageHeader } from "@/components/ui";
import { BuildStudio } from "@/components/build/BuildStudio";
import { getServerApp } from "@/lib/composition/server";

export const metadata = {
  title: "Build — Pipes",
  description: "Turn intent into a loop: describe a goal in plain language, or compile an existing document. One place to build.",
};

export default async function BuildPage() {
  await getServerApp();

  return (
    <div className="surface-subtle min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Breadcrumbs items={[{ label: "Workspace" }, { label: "Build" }]} />
        <div className="mt-3 mb-8">
          <PageHeader
            title="Build a loop"
            subtitle="Describe a goal and watch the agent plan it, or compile a document you already have. Either way, one typed loop comes out."
          />
        </div>
        <BuildStudio initialMode="describe" />
      </div>
    </div>
  );
}
