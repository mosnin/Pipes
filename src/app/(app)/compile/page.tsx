import { Breadcrumbs, PageHeader } from "@/components/ui";
import { CompilerClient } from "@/components/compile/CompilerClient";
import { getServerApp } from "@/lib/composition/server";

export const metadata = {
  title: "Skill Compiler — Pipes",
  description: "Convert documentation, SOPs, books, and API specs into executable agent loops.",
};

export default async function CompilePage() {
  await getServerApp();

  return (
    <div className="surface-subtle min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Breadcrumbs items={[{ label: "Workspace" }, { label: "Skill Compiler" }]} />
        <div className="mt-3 mb-8">
          <PageHeader
            title="Skill Compiler"
            subtitle="Paste any document — SOP, API spec, book chapter, or technical doc — and Pipes extracts an executable agent graph."
          />
        </div>
        <CompilerClient />
      </div>
    </div>
  );
}
