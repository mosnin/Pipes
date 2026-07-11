import { Breadcrumbs, PageHeader } from "@/components/ui";
import { BuildStudio } from "@/components/build/BuildStudio";
import { getServerApp } from "@/lib/composition/server";

export const metadata = {
  title: "Build — Pipes",
  description: "Compile a document — SOP, API spec, book chapter, or technical doc — into an executable agent loop.",
};

// /compile is preserved (existing links, command palette) but now renders the
// unified Build studio in compile mode — one door, two inputs.
export default async function CompilePage() {
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
        <BuildStudio initialMode="compile" />
      </div>
    </div>
  );
}
