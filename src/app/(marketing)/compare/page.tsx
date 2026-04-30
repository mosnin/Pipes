import { Card, Chip, Button } from "@heroui/react";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Pipes comparisons",
  description: "Honest comparisons: Pipes vs Figma, Miro, Lucidchart, and generic AI-generated diagrams."
};

export default function CompareIndexPage() {
  const comparisons = publicContentService.listComparisons();

  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Pipes vs. the alternatives
        </h1>
        <p className="text-lg text-gray-500">
          See why teams choose Pipes for structured system design
        </p>
      </div>

      {/* Grid of comparison cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {comparisons.map((item) => (
          <Card key={item.slug} className="flex flex-col gap-4 p-6">
            <Card.Header className="flex flex-col items-start gap-2 p-0">
              <Chip size="sm" variant="soft" color="default" className="text-xs font-medium">
                Comparison
              </Chip>
              <h2 className="text-xl font-semibold text-gray-900">{item.title}</h2>
            </Card.Header>
            <Card.Content className="flex flex-col gap-4 p-0">
              <p className="text-sm text-gray-500 leading-relaxed">{item.summary}</p>
              <TrackedLink
                href={`/compare/${item.slug}`}
                event="comparison_page_viewed"
                metadata={{ source: "compare_index", slug: item.slug }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit"
                >
                  See comparison <ArrowRight className="inline h-3.5 w-3.5 ml-1.5" />
                </Button>
              </TrackedLink>
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
}
