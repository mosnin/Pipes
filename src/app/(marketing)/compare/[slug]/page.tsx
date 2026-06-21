import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import {
  Breadcrumbs,
  Button,
} from "@/components/ui";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { CompareDetailHero } from "@/components/marketing/CompareDetailHero";
import {
  CompareFeatureMatrix,
  type FeatureRow,
  type FeatureValue,
} from "@/components/marketing/CompareFeatureMatrix";
import { CompareSwitchStrip } from "@/components/marketing/CompareSwitchStrip";
import { CompareInlineDemo } from "@/components/marketing/CompareInlineDemo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = publicContentService.getComparison(slug);
  if (!entry) return { title: "Comparison not found" };
  return { title: `${entry.title} - Looper`, description: entry.summary };
}

// ---------------------------------------------------------------------------
// Feature matrix
// ---------------------------------------------------------------------------

interface FeatureSpec {
  feature: string;
  pipes: FeatureValue;
  competitor: FeatureValue;
  why?: string;
}

const featureMatrices: Record<string, ReadonlyArray<FeatureSpec>> = {
  figma: [
    {
      feature: "AI builds the graph from a description",
      pipes: true,
      competitor: false,
      why: "You describe the system in one sentence. The agent draws the nodes and pipes. Figma asks you to draw it yourself.",
    },
    {
      feature: "Structured graph editor",
      pipes: true,
      competitor: "Frame-based",
      why: "Looper types every step, port, and connection. Figma frames are pictures the runtime cannot read.",
    },
    {
      feature: "AI-native editing",
      pipes: true,
      competitor: "Plugins only",
      why: "In Looper the chat is the input and the canvas is the output. In Figma the AI lives in a side panel.",
    },
    {
      feature: "Protocol surface for agents",
      pipes: true,
      competitor: false,
      why: "Hand any agent a Looper token. It reads the same graph through one MCP endpoint.",
    },
    {
      feature: "Versioning",
      pipes: true,
      competitor: "Branch history",
      why: "Looper versions the schema. Figma versions the picture.",
    },
    {
      feature: "Handoff packages",
      pipes: true,
      competitor: "Dev Mode specs",
      why: "Looper exports the typed loop your runtime can run. Dev Mode exports a design spec for a human to read.",
    },
    {
      feature: "Simulation",
      pipes: true,
      competitor: false,
      why: "Looper can run the loop in the editor. Figma cannot execute a frame.",
    },
    {
      feature: "Multi-agent support",
      pipes: true,
      competitor: false,
      why: "Looper was built for handoff between planners, specialists, and reviewers.",
    },
    {
      feature: "Team collaboration",
      pipes: true,
      competitor: true,
      why: "Both are real-time. Looper review threads attach to typed nodes, not floating comments.",
    },
  ],
  miro: [
    {
      feature: "AI builds the graph from a description",
      pipes: true,
      competitor: false,
      why: "Looper turns one sentence into the system. Miro starts with a blank canvas.",
    },
    {
      feature: "Structured graph editor",
      pipes: true,
      competitor: "Freeform canvas",
      why: "Looper steps have types and typed ports. Miro shapes are just shapes.",
    },
    {
      feature: "AI-native editing",
      pipes: true,
      competitor: "Assist (limited)",
      why: "Miro Assist generates stickies. Looper drives the graph itself.",
    },
    {
      feature: "Protocol surface for agents",
      pipes: true,
      competitor: false,
    },
    {
      feature: "Versioning",
      pipes: true,
      competitor: false,
      why: "Looper records every turn. Miro keeps a board history but no typed diff.",
    },
    {
      feature: "Handoff packages",
      pipes: true,
      competitor: false,
    },
    {
      feature: "Simulation",
      pipes: true,
      competitor: false,
    },
    {
      feature: "Multi-agent support",
      pipes: true,
      competitor: false,
    },
    {
      feature: "Team collaboration",
      pipes: true,
      competitor: true,
      why: "Both are excellent for live editing. Miro wins on the workshop, Looper wins after.",
    },
  ],
  lucidchart: [
    {
      feature: "AI builds the graph from a description",
      pipes: true,
      competitor: false,
      why: "Looper is conversational. Lucidchart starts from shape libraries.",
    },
    {
      feature: "Structured graph editor",
      pipes: true,
      competitor: "Shape-based",
      why: "Looper steps have a contract. Lucidchart shapes do not.",
    },
    {
      feature: "AI-native editing",
      pipes: true,
      competitor: "Diagram generation",
      why: "Lucid can generate a diagram from a prompt once. Looper lets you correct it the way you correct a teammate.",
    },
    {
      feature: "Protocol surface for agents",
      pipes: true,
      competitor: false,
    },
    {
      feature: "Versioning",
      pipes: true,
      competitor: "Version history",
      why: "Both keep history. Only Looper diffs the typed schema.",
    },
    {
      feature: "Handoff packages",
      pipes: true,
      competitor: false,
    },
    {
      feature: "Simulation",
      pipes: true,
      competitor: false,
    },
    {
      feature: "Multi-agent support",
      pipes: true,
      competitor: false,
    },
    {
      feature: "Team collaboration",
      pipes: true,
      competitor: true,
    },
  ],
  "ai-generated-diagrams": [
    {
      feature: "AI builds the graph from a description",
      pipes: true,
      competitor: "One-shot picture",
      why: "Looper draws into an editor you can correct. A one-shot picture is the end of the conversation.",
    },
    {
      feature: "Structured graph editor",
      pipes: true,
      competitor: false,
      why: "Looper types every step and connection. A picture has no schema.",
    },
    {
      feature: "AI-native editing",
      pipes: true,
      competitor: "Generation only",
      why: "Looper lets you iterate the graph in conversation. Generators force you to regenerate the whole thing.",
    },
    {
      feature: "Protocol surface for agents",
      pipes: true,
      competitor: false,
    },
    {
      feature: "Versioning",
      pipes: true,
      competitor: false,
    },
    {
      feature: "Handoff packages",
      pipes: true,
      competitor: false,
    },
    {
      feature: "Simulation",
      pipes: true,
      competitor: false,
    },
    {
      feature: "Multi-agent support",
      pipes: true,
      competitor: false,
    },
    {
      feature: "Team collaboration",
      pipes: true,
      competitor: false,
    },
  ],
};

const defaultMatrix: ReadonlyArray<FeatureSpec> = [
  { feature: "AI builds the graph from a description", pipes: true, competitor: false },
  { feature: "Structured graph editor", pipes: true, competitor: false },
  { feature: "AI-native editing", pipes: true, competitor: false },
  { feature: "Protocol surface for agents", pipes: true, competitor: false },
  { feature: "Versioning", pipes: true, competitor: false },
  { feature: "Handoff packages", pipes: true, competitor: false },
  { feature: "Simulation", pipes: true, competitor: false },
  { feature: "Multi-agent support", pipes: true, competitor: false },
  { feature: "Team collaboration", pipes: true, competitor: false },
];

// ---------------------------------------------------------------------------
// Switch strip copy per competitor
// ---------------------------------------------------------------------------

interface SwitchCopy {
  choosePipes: ReadonlyArray<string>;
  chooseOther: ReadonlyArray<string>;
  quote: { text: string };
}

const switchCopy: Record<string, SwitchCopy> = {
  figma: {
    choosePipes: [
      "Your agents need to read the same graph you edit.",
      "Your team ships multi-agent systems to production.",
      "Your architecture diagrams keep going stale.",
    ],
    chooseOther: [
      "The artifact is a visual spec for a designer to hand off.",
      "Your team lives in design reviews, not handoff packages.",
      "You need pixel-perfect mocks, not a runnable graph.",
    ],
    quote: {
      text: "Figma frames are pictures a runtime cannot read. Looper graphs are the source the runtime reads.",
    },
  },
  miro: {
    choosePipes: [
      "Your system has to survive the workshop.",
      "Your runtime needs the same map your team draws.",
      "Your team is tired of stickies turning into stale boards.",
    ],
    chooseOther: [
      "The workshop is the whole job.",
      "You need a wall of stickies, not a typed graph.",
      "Brainstorming is the deliverable.",
    ],
    quote: {
      text: "Miro wins the meeting. Looper wins after it — when the artifact has to survive into code.",
    },
  },
  lucidchart: {
    choosePipes: [
      "The artifact has to be read by software, not just humans.",
      "Your runtime needs the schema, not a PNG.",
      "Your team writes the system in conversation, not from a shape library.",
    ],
    chooseOther: [
      "The audience is an architecture review board.",
      "You need every UML and AWS shape pre-built.",
      "The deliverable is a static diagram in a doc.",
    ],
    quote: {
      text: "A diagram is where the picture lives. Looper is where the system lives.",
    },
  },
  "ai-generated-diagrams": {
    choosePipes: [
      "You want to correct the graph, not regenerate it.",
      "Your team needs a typed system, not a picture.",
      "Your agents have to read the same graph.",
    ],
    chooseOther: [
      "A one-shot picture for a slide is enough.",
      "You will not edit it after.",
      "There is no runtime that needs to consume it.",
    ],
    quote: {
      text: "A generated diagram ends the conversation. Looper starts one that the runtime can finish.",
    },
  },
};

const defaultSwitchCopy: SwitchCopy = {
  choosePipes: [
    "Your system has to be read back by agents.",
    "Your team iterates the architecture in conversation.",
    "You want typed nodes, not floating shapes.",
  ],
  chooseOther: [
    "The deliverable is a picture, not a system.",
    "You will not need to edit it after.",
    "No runtime has to consume the artifact.",
  ],
  quote: {
    text: "Looper is the difference between an architecture slide and an architecture that runs.",
  },
};

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

  const competitorName = entry.title.replace(/^Looper vs\.?\s*/i, "").trim();
  const baseRows = featureMatrices[slug] ?? defaultMatrix;
  const featureRows: FeatureRow[] = baseRows.map((r, i) => ({ id: `r-${i}`, ...r }));

  const pipesWins = featureRows.filter(
    (r) => r.pipes === true && r.competitor !== true,
  ).length;
  const shared = featureRows.filter(
    (r) => r.pipes === true && r.competitor === true,
  ).length;
  const competitorWins = featureRows.filter(
    (r) => r.pipes !== true && r.competitor === true,
  ).length;

  const copy = switchCopy[slug] ?? defaultSwitchCopy;

  return (
    <main className="min-h-screen bg-white pb-20">
      {/* Breadcrumb bar */}
      <div className="border-b border-black/[0.06] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <Breadcrumbs
            items={[
              { label: "Compare", href: "/compare" },
              { label: competitorName },
            ]}
          />
        </div>
      </div>

      {/* 1. Detail hero with 3 metric cards */}
      <CompareDetailHero
        competitor={competitorName}
        summary={entry.summary}
        pipesWins={pipesWins}
        shared={shared}
        competitorWins={competitorWins}
      />

      {/* 2. Feature matrix */}
      <div className="mt-12 sm:mt-16">
        <CompareFeatureMatrix
          competitor={competitorName}
          rows={featureRows}
        />
      </div>

      {/* 3. When to choose what */}
      <div className="mt-12 sm:mt-16">
        <CompareSwitchStrip
          competitor={competitorName}
          choosePipes={copy.choosePipes}
          chooseOther={copy.chooseOther}
        />
      </div>

      {/* 3b. Side-by-side embedded demo */}
      <div className="mt-12 sm:mt-16">
        <CompareInlineDemo competitor={competitorName} />
      </div>

      {/* 4. Quote */}
      <section className="mt-12 sm:mt-16 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[32px] bg-white border border-black/[0.06] px-6 py-12 sm:px-12 sm:py-14">
            <figure className="max-w-3xl">
              <span aria-hidden="true" className="t-display text-indigo-200 leading-none block">
                &quot;
              </span>
              <blockquote className="-mt-6">
                <p className="t-h2 text-[#111] leading-tight">
                  {copy.quote.text}
                </p>
              </blockquote>
              <figcaption className="mt-6">
                <span className="t-caption text-[#8E8E93]">From the Looper team</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* 5. Final CTA */}
      <section className="mt-12 sm:mt-16 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[40px] bg-indigo-600 text-white px-6 py-14 sm:px-12 sm:py-20 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 max-w-xl">
              <h2 className="t-h2 text-white">
                See it for yourself.
              </h2>
              <p className="t-body text-white/85">
                Open a fresh workspace. Describe your loop. Looper draws it on the canvas.
              </p>
            </div>
            <TrackedLink
              href={`/signup?source=compare_${entry.slug}`}
              event="signup_started"
              metadata={{ source: `compare_${entry.slug}_cta` }}
            >
              <Button variant="primary" className="bg-white text-indigo-600 hover:bg-indigo-50">
                Start free
                <ArrowRight size={14} className="ml-1.5" aria-hidden="true" />
              </Button>
            </TrackedLink>
          </div>
        </div>
      </section>
    </main>
  );
}
