import { Card, PageHeader } from "@/components/ui";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export const metadata = {
  title: "Pipes comparisons",
  description: "Honest comparisons: Pipes vs Figma, Miro, Lucidchart, and generic AI-generated diagrams."
};

export default function CompareIndexPage() {
  const comparisons = publicContentService.listComparisons();
  return (
    <div>
      <PageHeader title="Comparisons" subtitle="Where Pipes fits relative to diagram and collaboration alternatives." />
      <div className="grid-2">
        {comparisons.map((item) => <Card key={item.slug}><h3>{item.title}</h3><p>{item.summary}</p><TrackedLink href={`/compare/${item.slug}`} event="comparison_page_viewed" metadata={{ source: "compare_index", slug: item.slug }}>View comparison</TrackedLink></Card>)}
      </div>
    </div>
  );
}
