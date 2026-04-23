import { notFound } from "next/navigation";
import { Card, PageHeader, SectionHeader, Button } from "@/components/ui";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = publicContentService.getComparison(slug);
  if (!entry) return { title: "Comparison not found" };
  return { title: `${entry.title}`, description: entry.summary };
}

export default async function CompareDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = publicContentService.getComparison(slug);
  if (!entry) notFound();

  return (
    <div>
      <PageHeader title={entry.title} subtitle={entry.summary} />
      <Card>
        <SectionHeader title="Where Pipes differs" />
        {entry.differences.map((d) => <p key={d}>• {d}</p>)}
      </Card>
      <Card>
        <SectionHeader title="Best fit" description={entry.bestFor} />
        <TrackedLink href="/signup?source=compare_page" event="signup_started" metadata={{ source: `compare_${entry.slug}` }}><Button>Try Pipes</Button></TrackedLink>
      </Card>
    </div>
  );
}
