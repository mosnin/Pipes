import { notFound } from "next/navigation";
import { ArrowRight, Check, Minus, Quote, X } from "lucide-react";
import {
  Breadcrumbs,
  Button,
  CardShell,
  CardBody,
  CardHeader,
  DataTable,
  type DataTableColumn,
  MetricCard,
  StatusBadge,
} from "@/components/ui";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = publicContentService.getComparison(slug);
  if (!entry) return { title: "Comparison not found" };
  return { title: `${entry.title} - Pipes`, description: entry.summary };
}

// ---------------------------------------------------------------------------
// Feature matrix
// ---------------------------------------------------------------------------

type FeatureValue = true | false | string;

interface FeatureRow {
  id: string;
  feature: string;
  pipes: FeatureValue;
  competitor: FeatureValue;
}

const featureMatrices: Record<string, ReadonlyArray<Omit<FeatureRow, "id">>> = {
  figma: [
    { feature: "Structured graph editor", pipes: true, competitor: "Frame-based" },
    { feature: "AI-native editing", pipes: true, competitor: "Plugins only" },
    { feature: "Protocol / API surface", pipes: true, competitor: false },
    { feature: "Versioning", pipes: true, competitor: "Branch history" },
    { feature: "Handoff packages", pipes: true, competitor: "Dev Mode specs" },
    { feature: "Simulation", pipes: true, competitor: false },
    { feature: "Multi-agent support", pipes: true, competitor: false },
    { feature: "Team collaboration", pipes: true, competitor: true },
  ],
  miro: [
    { feature: "Structured graph editor", pipes: true, competitor: "Freeform canvas" },
    { feature: "AI-native editing", pipes: true, competitor: "Assist (limited)" },
    { feature: "Protocol / API surface", pipes: true, competitor: false },
    { feature: "Versioning", pipes: true, competitor: false },
    { feature: "Handoff packages", pipes: true, competitor: false },
    { feature: "Simulation", pipes: true, competitor: false },
    { feature: "Multi-agent support", pipes: true, competitor: false },
    { feature: "Team collaboration", pipes: true, competitor: true },
  ],
  lucidchart: [
    { feature: "Structured graph editor", pipes: true, competitor: "Shape-based" },
    { feature: "AI-native editing", pipes: true, competitor: "Diagram generation" },
    { feature: "Protocol / API surface", pipes: true, competitor: false },
    { feature: "Versioning", pipes: true, competitor: "Version history" },
    { feature: "Handoff packages", pipes: true, competitor: false },
    { feature: "Simulation", pipes: true, competitor: false },
    { feature: "Multi-agent support", pipes: true, competitor: false },
    { feature: "Team collaboration", pipes: true, competitor: true },
  ],
  "ai-generated-diagrams": [
    { feature: "Structured graph editor", pipes: true, competitor: false },
    { feature: "AI-native editing", pipes: true, competitor: "Generation only" },
    { feature: "Protocol / API surface", pipes: true, competitor: false },
    { feature: "Versioning", pipes: true, competitor: false },
    { feature: "Handoff packages", pipes: true, competitor: false },
    { feature: "Simulation", pipes: true, competitor: false },
    { feature: "Multi-agent support", pipes: true, competitor: false },
    { feature: "Team collaboration", pipes: true, competitor: false },
  ],
};

const defaultMatrix: ReadonlyArray<Omit<FeatureRow, "id">> = [
  { feature: "Structured graph editor", pipes: true, competitor: false },
  { feature: "AI-native editing", pipes: true, competitor: false },
  { feature: "Protocol / API surface", pipes: true, competitor: false },
  { feature: "Versioning", pipes: true, competitor: false },
  { feature: "Handoff packages", pipes: true, competitor: false },
  { feature: "Simulation", pipes: true, competitor: false },
  { feature: "Multi-agent support", pipes: true, competitor: false },
  { feature: "Team collaboration", pipes: true, competitor: false },
];

// ---------------------------------------------------------------------------
// Cell renderer
// ---------------------------------------------------------------------------

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-1.5 t-label font-medium text-[#065F46]">
        <Check size={14} className="shrink-0" aria-hidden="true" />
        Yes
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1.5 t-label text-[#8E8E93]">
        <X size={14} className="shrink-0" aria-hidden="true" />
        No
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 t-label text-[#3C3C43]">
      <Minus size={14} className="shrink-0 text-[#C7C7CC]" aria-hidden="true" />
      {value}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CompareDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = publicContentService.getComparison(slug);
  if (!entry) notFound();

  const competitorName = entry.title.replace(/^Pipes vs\.?\s*/i, "").trim();
  const baseRows = featureMatrices[slug] ?? defaultMatrix;
  const featureRows: FeatureRow[] = baseRows.map((r, i) => ({ id: `r-${i}`, ...r }));

  // Stats
  const pipesWins = featureRows.filter(
    (r) => r.pipes === true && r.competitor !== true,
  ).length;
  const shared = featureRows.filter(
    (r) => r.pipes === true && r.competitor === true,
  ).length;
  const competitorWins = featureRows.filter(
    (r) => r.pipes !== true && r.competitor === true,
  ).length;

  const columns: DataTableColumn<FeatureRow>[] = [
    {
      key: "feature",
      header: "Feature",
      render: (row) => (
        <span className="t-label font-medium text-[#111]">{row.feature}</span>
      ),
    },
    {
      key: "pipes",
      header: "Pipes",
      render: (row) => <FeatureCell value={row.pipes} />,
    },
    {
      key: "competitor",
      header: competitorName,
      render: (row) => <FeatureCell value={row.competitor} />,
    },
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* Breadcrumb bar */}
      <div className="surface-subtle border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <Breadcrumbs
            items={[
              { label: "Compare", href: "/compare" },
              { label: competitorName },
            ]}
          />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col gap-10">
        {/* Hero */}
        <header className="flex flex-col gap-4 max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#111] text-white t-label font-bold">
              P
            </span>
            <span className="t-label text-[#8E8E93]">vs</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F5F5F7] border border-black/[0.06] text-[#111] t-label font-bold">
              {competitorName.charAt(0).toUpperCase() || "?"}
            </span>
          </div>
          <h1 className="t-h1 text-[#111]">Pipes vs {competitorName}.</h1>
          <p className="t-body text-[#3C3C43]">{entry.summary}</p>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MetricCard
            label="Pipes wins"
            value={pipesWins}
            delta={`+${pipesWins}`}
            deltaTone="up"
            footer="Capabilities only Pipes ships"
          />
          <MetricCard
            label="Shared"
            value={shared}
            footer="Capabilities both products provide"
          />
          <MetricCard
            label={`${competitorName} wins`}
            value={competitorWins}
            footer={`Where ${competitorName} leads today`}
          />
        </section>

        {/* Feature table */}
        <section>
          <h2 className="t-overline text-[#8E8E93] mb-3">Feature comparison</h2>
          <CardShell>
            <DataTable<FeatureRow> columns={columns} rows={featureRows} />
          </CardShell>
        </section>

        {/* Best fit cards */}
        <section>
          <h2 className="t-overline text-[#8E8E93] mb-3">When to choose what</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CardShell>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="t-label font-semibold text-[#111]">Choose Pipes</h3>
                  <StatusBadge tone="success">Recommended</StatusBadge>
                </div>
              </CardHeader>
              <CardBody>
                <p className="t-label text-[#3C3C43] leading-relaxed">{entry.bestFor}</p>
              </CardBody>
            </CardShell>
            <CardShell>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="t-label font-semibold text-[#111]">
                    Choose {competitorName}
                  </h3>
                  <StatusBadge tone="neutral">Alternative</StatusBadge>
                </div>
              </CardHeader>
              <CardBody>
                <p className="t-label text-[#3C3C43] leading-relaxed">
                  When the goal is a picture, not a system your agents will read.
                </p>
              </CardBody>
            </CardShell>
          </div>
        </section>

        {/* Differences as quotes */}
        <section>
          <h2 className="t-overline text-[#8E8E93] mb-3">Why teams choose Pipes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {entry.differences.map((diff) => (
              <CardShell key={diff} padded>
                <Quote
                  size={16}
                  className="text-indigo-600 shrink-0 mb-2"
                  aria-hidden="true"
                />
                <p className="t-label text-[#111] leading-relaxed">{diff}</p>
              </CardShell>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section>
          <CardShell padded className="surface-subtle">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-2">
              <div>
                <h3 className="t-h3 text-[#111]">See it for yourself</h3>
                <p className="mt-1 t-label text-[#3C3C43]">
                  Spin up a free Pipes workspace - no credit card, no time limit.
                </p>
              </div>
              <TrackedLink
                href="/signup?source=compare_page"
                event="signup_started"
                metadata={{ source: `compare_${entry.slug}` }}
              >
                <Button variant="primary">
                  Try Pipes free
                  <ArrowRight size={14} className="ml-1.5" aria-hidden="true" />
                </Button>
              </TrackedLink>
            </div>
          </CardShell>
        </section>
      </div>
    </main>
  );
}
