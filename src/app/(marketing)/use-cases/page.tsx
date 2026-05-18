import { Card } from "@heroui/react";
import { ArrowRight } from "lucide-react";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export const metadata = {
  title: "Pipes use cases",
  description:
    "Technical use cases for reusable systems: multi-agent, automation, support ops, architecture, and handoff."
};

export default function UseCasesPage() {
  const cases = publicContentService.listUseCases();
  const templates = publicContentService.listTemplates();

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-3">
          Built for every team
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto">
          From multi-agent systems to support automation, Pipes fits your
          workflow
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cases.map((entry) => {
          const relatedCount = templates.filter((t) =>
            (entry.templateIds as readonly string[]).includes(t.id)
          ).length;

          return (
            <Card
              key={entry.slug}
              className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <Card.Header className="pb-2">
                <h2 className="font-bold text-lg text-slate-900">
                  {entry.title}
                </h2>
              </Card.Header>
              <Card.Content className="pt-0 flex flex-col gap-4">
                <p className="text-slate-600 text-sm line-clamp-3">
                  {entry.problem}
                </p>

                <ol className="flex flex-col gap-1">
                  {entry.workflow.slice(0, 3).map((step, i) => (
                    <li
                      key={step}
                      className="flex items-start gap-2 text-xs text-slate-500"
                    >
                      <span className="flex-shrink-0 w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-[10px] mt-0.5">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400">
                    {relatedCount} template{relatedCount !== 1 ? "s" : ""}{" "}
                    available
                  </span>
                  <TrackedLink
                    href={`/use-cases/${entry.slug}`}
                    event="use_case_viewed"
                    metadata={{ source: "use_cases_index", slug: entry.slug }}
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Explore use case
                    <ArrowRight className="w-3.5 h-3.5" />
                  </TrackedLink>
                </div>
              </Card.Content>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
