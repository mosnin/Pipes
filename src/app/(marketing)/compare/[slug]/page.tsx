import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  Chip,
  Separator,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/react";
import { CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = publicContentService.getComparison(slug);
  if (!entry) return { title: "Comparison not found" };
  return { title: entry.title, description: entry.summary };
}

// ---------------------------------------------------------------------------
// Feature matrix — keyed by slug. Competitors are diagramming / whiteboard
// tools without agent-execution capabilities; Pipes ships all execution-layer
// features natively.
// ---------------------------------------------------------------------------

type FeatureValue = true | false | string;

interface FeatureRow {
  feature: string;
  pipes: FeatureValue;
  competitor: FeatureValue;
}

const featureMatrices: Record<string, FeatureRow[]> = {
  figma: [
    { feature: "Structured graph editor",   pipes: true,  competitor: "Interface / frame-based" },
    { feature: "AI-native editing",          pipes: true,  competitor: "Plugins only" },
    { feature: "Protocol / API surface",     pipes: true,  competitor: false },
    { feature: "Versioning",                 pipes: true,  competitor: "Branch history" },
    { feature: "Handoff packages",           pipes: true,  competitor: "Dev Mode specs" },
    { feature: "Simulation",                 pipes: true,  competitor: false },
    { feature: "Multi-agent support",        pipes: true,  competitor: false },
    { feature: "Team collaboration",         pipes: true,  competitor: true },
  ],
  miro: [
    { feature: "Structured graph editor",   pipes: true,  competitor: "Freeform canvas" },
    { feature: "AI-native editing",          pipes: true,  competitor: "Assist (limited)" },
    { feature: "Protocol / API surface",     pipes: true,  competitor: false },
    { feature: "Versioning",                 pipes: true,  competitor: false },
    { feature: "Handoff packages",           pipes: true,  competitor: false },
    { feature: "Simulation",                 pipes: true,  competitor: false },
    { feature: "Multi-agent support",        pipes: true,  competitor: false },
    { feature: "Team collaboration",         pipes: true,  competitor: true },
  ],
  lucidchart: [
    { feature: "Structured graph editor",   pipes: true,  competitor: "Shape-based diagramming" },
    { feature: "AI-native editing",          pipes: true,  competitor: "AI diagram generation" },
    { feature: "Protocol / API surface",     pipes: true,  competitor: false },
    { feature: "Versioning",                 pipes: true,  competitor: "Version history" },
    { feature: "Handoff packages",           pipes: true,  competitor: false },
    { feature: "Simulation",                 pipes: true,  competitor: false },
    { feature: "Multi-agent support",        pipes: true,  competitor: false },
    { feature: "Team collaboration",         pipes: true,  competitor: true },
  ],
  "ai-generated-diagrams": [
    { feature: "Structured graph editor",   pipes: true,  competitor: false },
    { feature: "AI-native editing",          pipes: true,  competitor: "Generation only" },
    { feature: "Protocol / API surface",     pipes: true,  competitor: false },
    { feature: "Versioning",                 pipes: true,  competitor: false },
    { feature: "Handoff packages",           pipes: true,  competitor: false },
    { feature: "Simulation",                 pipes: true,  competitor: false },
    { feature: "Multi-agent support",        pipes: true,  competitor: false },
    { feature: "Team collaboration",         pipes: true,  competitor: false },
  ],
};

// Fallback matrix for any future slug not yet in the map
const defaultMatrix: FeatureRow[] = [
  { feature: "Structured graph editor",   pipes: true,  competitor: false },
  { feature: "AI-native editing",          pipes: true,  competitor: false },
  { feature: "Protocol / API surface",     pipes: true,  competitor: false },
  { feature: "Versioning",                 pipes: true,  competitor: false },
  { feature: "Handoff packages",           pipes: true,  competitor: false },
  { feature: "Simulation",                 pipes: true,  competitor: false },
  { feature: "Multi-agent support",        pipes: true,  competitor: false },
  { feature: "Team collaboration",         pipes: true,  competitor: false },
];

// ---------------------------------------------------------------------------
// Cell renderer
// ---------------------------------------------------------------------------

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) {
    return (
      <span className="flex items-center gap-1.5 text-green-600 font-medium text-sm">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Yes
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="flex items-center gap-1.5 text-gray-400 text-sm">
        <XCircle className="h-4 w-4 shrink-0" />
        No
      </span>
    );
  }
  // Descriptive string — neutral styling
  return <span className="text-sm text-gray-600">{value}</span>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CompareDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = publicContentService.getComparison(slug);
  if (!entry) notFound();

  // Derive a short competitor name from the title "Pipes vs Foo" → "Foo"
  const competitorName = entry.title.replace(/^Pipes vs\.?\s*/i, "").trim();

  const featureRows = featureMatrices[slug] ?? defaultMatrix;

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-8">
        <Link href="/compare" className="hover:text-gray-800 transition-colors">
          Compare
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-gray-800 font-medium">{competitorName}</span>
      </nav>

      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Pipes vs {competitorName}
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed max-w-2xl">
          {entry.summary}
        </p>
      </div>

      <Separator className="mb-10" />

      {/* Key Differences */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-900 mb-5 uppercase tracking-wide">
          Key differences
        </h2>
        <ul className="flex flex-col gap-3">
          {entry.differences.map((diff) => (
            <li key={diff} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <span className="text-gray-700 leading-snug">{diff}</span>
            </li>
          ))}
        </ul>
      </section>

      <Separator className="mb-10" />

      {/* Best Fit */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-900 mb-5 uppercase tracking-wide">
          Best fit
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border border-green-200 bg-green-50/50">
            <Card.Header className="pb-1 pt-5 px-5">
              <Chip size="sm" variant="soft" color="success" className="font-semibold text-xs">
                Choose Pipes
              </Chip>
            </Card.Header>
            <Card.Content className="px-5 pb-5 pt-2">
              <p className="text-sm text-gray-700 leading-relaxed">{entry.bestFor}</p>
            </Card.Content>
          </Card>

          <Card className="border border-gray-200 bg-gray-50/50">
            <Card.Header className="pb-1 pt-5 px-5">
              <Chip size="sm" variant="soft" color="default" className="font-semibold text-xs">
                Choose {competitorName}
              </Chip>
            </Card.Header>
            <Card.Content className="px-5 pb-5 pt-2">
              <p className="text-sm text-gray-700 leading-relaxed">
                When visual communication and presentation are the primary goal and execution
                context is not required.
              </p>
            </Card.Content>
          </Card>
        </div>
      </section>

      <Separator className="mb-10" />

      {/* Feature Comparison Table */}
      <section className="mb-12">
        <h2 className="text-sm font-semibold text-gray-900 mb-5 uppercase tracking-wide">
          Feature comparison
        </h2>
        <Table
          aria-label={`Feature comparison: Pipes vs ${competitorName}`}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <Table.Content>
            <TableHeader>
              <TableColumn key="feature" className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide font-semibold">
                Feature
              </TableColumn>
              <TableColumn key="pipes" className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide font-semibold">
                Pipes
              </TableColumn>
              <TableColumn key="competitor" className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide font-semibold">
                {competitorName}
              </TableColumn>
            </TableHeader>
            <TableBody>
              {featureRows.map((row) => (
                <TableRow key={row.feature}>
                  <TableCell>
                    <span className="text-sm font-medium text-gray-800">{row.feature}</span>
                  </TableCell>
                  <TableCell>
                    <FeatureCell value={row.pipes} />
                  </TableCell>
                  <TableCell>
                    <FeatureCell value={row.competitor} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table.Content>
        </Table>
      </section>

      {/* CTA */}
      <div className="flex flex-col items-center text-center gap-4 bg-gray-50 border border-gray-200 rounded-2xl py-12 px-8">
        <h3 className="text-2xl font-bold text-gray-900">Ready to get started?</h3>
        <p className="text-gray-500 max-w-md">
          Bring structure, validation, and protocol-readiness to your system design — free to start.
        </p>
        <TrackedLink
          href="/signup?source=compare_page"
          event="signup_started"
          metadata={{ source: `compare_${entry.slug}` }}
        >
          <Button
            variant="primary"
            size="lg"
            className="px-8 font-semibold"
          >
            Try Pipes free
          </Button>
        </TrackedLink>
      </div>
    </div>
  );
}
