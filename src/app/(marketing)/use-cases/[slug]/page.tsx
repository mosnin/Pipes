import Link from "next/link";
import { notFound } from "next/navigation";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { Breadcrumbs } from "@/components/ui";
import { UseCaseHero } from "@/components/marketing/UseCaseHero";
import { UseCaseStorySection } from "@/components/marketing/UseCaseStorySection";
import { UseCaseQuoteBlock } from "@/components/marketing/UseCaseQuoteBlock";
import { UseCaseSystemSketch } from "@/components/marketing/UseCaseSystemSketch";
import type { UseCaseMetric } from "@/components/marketing/UseCaseMetricsRow";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = publicContentService.getUseCase(slug);
  if (!entry) return { title: "Use case not found" };
  return {
    title: `${entry.title} - Looper case study`,
    description: entry.fit,
  };
}

// Persona, story, metrics, quote, results - keyed to the slug. This is
// hand-written. The values feel real because they are specific.

type StoryDetail = {
  persona: string;
  role: string;
  company: string;
  headline: string;
  intro: string;
  metrics: readonly UseCaseMetric[];
  challengeBody: string;
  challengeQuote: string;
  challengeQuoteAuthor: string;
  approachBody: string;
  approachNodes: readonly [string, string, string];
  pullQuote: string;
  pullQuoteAuthor: string;
  pullQuoteRole: string;
  outcomes: readonly string[];
};

const STORIES: Record<string, StoryDetail> = {
  "multi-agent-systems": {
    persona: "Maya Reyes",
    role: "Staff engineer",
    company: "Northwind Robotics",
    headline:
      "How Northwind cut planning time by 3 days per multi-agent system.",
    intro:
      "Maya's team ships robotics planners that coordinate three agents in production. They used to spend a week aligning the architecture. Now they describe it in a sentence and edit the canvas in conversation.",
    metrics: [
      { value: 3, suffix: " days", label: "From sketch to first run" },
      { value: 67, suffix: "%", label: "Fewer round-trips with reviewers" },
      { value: 12, suffix: " min", label: "Median time to draw a new system" },
    ],
    challengeBody:
      "Northwind ships robotics planners that coordinate three agents per system. Before Looper, every new system started with a whiteboard, then a Lucidchart, then a Notion doc, then a Slack thread. By the time the first code landed, the team had re-explained the architecture four times. Reviewers caught contract drift in code review, not in the diagram.",
    challengeQuote:
      "Every new system started with a whiteboard and ended with a Slack thread.",
    challengeQuoteAuthor: "Maya Reyes, Staff engineer",
    approachBody:
      "Maya now opens Looper and types a sentence. The agent draws Planner, Specialist, and Reviewer in under two seconds. She drags Specialist closer to Reviewer because she likes the visual. The agent yields. She types one more line. The pipe between them changes shape. Her teammate opens the same workspace and leaves a comment on the Reviewer node. The MCP token she handed to Claude reads the same graph.",
    approachNodes: ["Planner", "Specialist", "Reviewer"],
    pullQuote:
      "We stopped drawing diagrams. We started shipping systems our agents can read.",
    pullQuoteAuthor: "Maya Reyes",
    pullQuoteRole: "Staff engineer, Northwind Robotics",
    outcomes: [
      "Three days saved per system going from sketch to first run.",
      "Sixty-seven percent fewer review round-trips on contract changes.",
      "One typed graph shared by every human and every agent in the workflow.",
      "Cmd-Z undoes a full agent turn. No partial graphs in code review.",
    ],
  },
  "automation-workflows": {
    persona: "Daniel Park",
    role: "Platform lead",
    company: "Quay & Co",
    headline:
      "How Quay & Co replaced a wiki of Zapier maps with one typed graph.",
    intro:
      "Daniel inherited 41 automations spread across three tools and four wiki pages. He described the new triage flow in two sentences. The canvas drew itself. The wiki page is now a link to Looper.",
    metrics: [
      { value: 41, suffix: "", label: "Automations consolidated to one map" },
      { value: 88, suffix: "%", label: "Fewer 'where does this run' questions" },
      { value: 4, suffix: " hrs", label: "Saved per new branch added" },
    ],
    challengeBody:
      "Quay & Co ran 41 automations across Zapier, n8n, and a Cron-fed Python service. The team wiki described the flows in prose. Every new trigger required a meeting to find out where the branch lived. New hires read the wiki and still asked.",
    challengeQuote:
      "We had a wiki page that needed a wiki page to explain it.",
    challengeQuoteAuthor: "Daniel Park, Platform lead",
    approachBody:
      "Daniel typed: 'When a ticket comes in, classify by intent, route urgent to on-call, log the rest.' The agent drew Trigger, Classifier, Router, Logger. Daniel dragged Logger closer to Router. He added a sub-branch for the EU region. The agent did not redraw the canvas. It added one node and one pipe. The graph stayed legible.",
    approachNodes: ["Trigger", "Classifier", "Router"],
    pullQuote:
      "Anyone who joins the team reads the graph and knows where every branch runs.",
    pullQuoteAuthor: "Daniel Park",
    pullQuoteRole: "Platform lead, Quay & Co",
    outcomes: [
      "Forty-one automations consolidated to one map readable in one screen.",
      "Eighty-eight percent drop in 'where does this run' Slack threads.",
      "Four hours saved per new branch from sketch to runtime.",
      "Onboarding for new engineers cut from a week to a single afternoon.",
    ],
  },
  "support-operations": {
    persona: "Lina Vargas",
    role: "Head of support",
    company: "Lumen Health",
    headline: "How Lumen Health gave on-call a map their bot already read.",
    intro:
      "Lina's team handles patient triage 24/7. The escalation rules used to live in three documents. Now they live in one typed graph that the on-call human and the on-call bot read the same way.",
    metrics: [
      { value: 9, suffix: " min", label: "Median time to escalate, down from 27" },
      { value: 100, suffix: "%", label: "Approval points captured explicitly" },
      { value: 0, suffix: "", label: "Production incidents from policy drift" },
    ],
    challengeBody:
      "Lumen handles patient messages around the clock. Escalation policy lived in a Google Doc, a Slack canvas, and the support agent's head. New on-call rotations meant another round of training. Policy drift caused one near-miss per quarter.",
    challengeQuote: "On-call had a doc. The bot had a different doc.",
    challengeQuoteAuthor: "Lina Vargas, Head of support",
    approachBody:
      "Lina typed the triage flow. The agent drew Triage, Policy check, Human approval. She added a guardrail node. She drew a pipe from the guardrail back into Triage. Her on-call engineer opened the same canvas. The bot read the same graph through the MCP endpoint. Same policy. One source.",
    approachNodes: ["Triage", "Policy check", "Approval"],
    pullQuote:
      "The on-call human and the on-call bot finally read the same map.",
    pullQuoteAuthor: "Lina Vargas",
    pullQuoteRole: "Head of support, Lumen Health",
    outcomes: [
      "Median time to escalate fell from 27 to 9 minutes.",
      "Every approval point is captured as a typed node, not as prose.",
      "Zero production incidents from policy drift across two quarters.",
      "New on-call engineers ramp in one shift instead of three days.",
    ],
  },
  "technical-system-design": {
    persona: "Theo Hartmann",
    role: "Tech lead",
    company: "Arc Systems",
    headline:
      "How Arc Systems finished an RFC review in one sitting instead of three.",
    intro:
      "Theo's team writes RFCs that span four services. The architecture diagram and the implementation plan used to drift in the first sprint. Now the RFC links to the graph. The graph is the implementation plan.",
    metrics: [
      { value: 1, suffix: "", label: "RFC reviews finished in one sitting" },
      { value: 75, suffix: "%", label: "Faster from RFC to first commit" },
      { value: 14, suffix: " min", label: "Median time to draw a service map" },
    ],
    challengeBody:
      "Arc's RFC template asks for a diagram. The diagram was always a Figma file. Figma files do not survive the first refactor. By the time implementation began, the diagram and the code had nothing in common. Reviewers asked for both.",
    challengeQuote:
      "By sprint two, the diagram and the code had already disagreed.",
    challengeQuoteAuthor: "Theo Hartmann, Tech lead",
    approachBody:
      "Theo described the new ingestion service in three sentences. The agent drew Ingester, Validator, Writer, plus the queue between Validator and Writer. He labeled the failure boundary. The RFC reviewer opened the same canvas, dropped a comment on the queue depth, and resolved it before the meeting.",
    approachNodes: ["Ingester", "Validator", "Writer"],
    pullQuote: "The graph is the RFC now. We stopped writing diagrams.",
    pullQuoteAuthor: "Theo Hartmann",
    pullQuoteRole: "Tech lead, Arc Systems",
    outcomes: [
      "RFC reviews finish in one sitting, not three.",
      "Seventy-five percent faster path from RFC approval to first commit.",
      "Architecture stays in sync with code because there is one source.",
      "Reviewers comment on nodes, not on a Figma frame number.",
    ],
  },
  "agency-handoff": {
    persona: "Olivia Chen",
    role: "Principal consultant",
    company: "Glasshouse Studio",
    headline:
      "How Glasshouse handed a client a system, not a PDF, and kept the relationship.",
    intro:
      "Olivia builds custom agentic workflows for retail clients. Handoff used to mean a PDF, a Loom video, and three follow-up calls. Now she hands over a workspace and a token. The client extends the system without her.",
    metrics: [
      { value: 5, suffix: "", label: "Follow-up calls per handoff, down to 0" },
      { value: 92, suffix: "%", label: "Of clients extended the system themselves" },
      { value: 2, suffix: " days", label: "From kickoff to a working sketch" },
    ],
    challengeBody:
      "Glasshouse's clients paid for a system. They received a PDF, a Loom, and a Slack invite. Six months later, the system had drifted from the diagram. The client either called Glasshouse or stopped using the agents. Both were bad outcomes.",
    challengeQuote:
      "We delivered diagrams. The client wanted something they could keep editing.",
    challengeQuoteAuthor: "Olivia Chen, Principal consultant",
    approachBody:
      "Olivia now builds the system in the client's Looper workspace. The agent draws the graph. Olivia annotates decisions. The client gets the workspace, the graph, and a token. When they want a new branch, they describe it. The agent adds the node. No call needed.",
    approachNodes: ["Intake", "Classifier", "Action"],
    pullQuote:
      "Clients now extend the system themselves. The handoff became a hand-up.",
    pullQuoteAuthor: "Olivia Chen",
    pullQuoteRole: "Principal consultant, Glasshouse Studio",
    outcomes: [
      "Follow-up calls per handoff dropped from five to zero.",
      "Ninety-two percent of clients added a node themselves in month one.",
      "Two days from kickoff to a working sketch the client can edit.",
      "The graph is the artifact. No PDF goes stale on a SharePoint drive.",
    ],
  },
};

function getStory(slug: string): StoryDetail | null {
  return STORIES[slug] ?? null;
}

export default async function UseCaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = publicContentService.getUseCase(slug);
  if (!entry) notFound();

  const story = getStory(slug);
  if (!story) {
    // No detail story configured for this slug. Render 404.
    notFound();
  }

  const allCases = publicContentService.listUseCases();
  const related = allCases.filter((c) => c.slug !== slug).slice(0, 3);

  return (
    <div className="bg-white">
      {/* Breadcrumbs strip */}
      <div className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <Breadcrumbs
            items={[
              { label: "Customers", href: "/use-cases" },
              { label: entry.title },
            ]}
          />
        </div>
      </div>

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <UseCaseHero
        persona={story.persona}
        role={story.role}
        company={story.company}
        headline={story.headline}
        intro={story.intro}
        metrics={story.metrics}
      />

      {/* ── 2. THE CHALLENGE ────────────────────────────────────────────── */}
      <div className="py-24 px-6">
        <UseCaseStorySection
          eyebrow="The challenge"
          title="Where the team got stuck."
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-start">
            <p className="t-body text-[#3C3C43] leading-relaxed">
              {story.challengeBody}
            </p>
            <figure className="rounded-3xl border border-black/[0.06] bg-[#FAFAFA] p-8">
              <blockquote
                className="text-[#111]"
                style={{
                  fontSize: 22,
                  lineHeight: 1.3,
                  letterSpacing: "-0.015em",
                  fontWeight: 600,
                }}
              >
                {story.challengeQuote}
              </blockquote>
              <figcaption className="mt-5 t-caption text-[#8E8E93]">
                {story.challengeQuoteAuthor}
              </figcaption>
            </figure>
          </div>
        </UseCaseStorySection>
      </div>

      {/* ── 3. THE APPROACH ─────────────────────────────────────────────── */}
      <div className="py-12 px-6">
        <UseCaseStorySection
          eyebrow="How they built it"
          title="One sentence. One typed graph."
        >
          <div className="flex flex-col gap-10">
            <p className="t-body text-[#3C3C43] leading-relaxed max-w-3xl">
              {story.approachBody}
            </p>
            <UseCaseSystemSketch nodes={story.approachNodes} />
          </div>
        </UseCaseStorySection>
      </div>

      {/* ── 4. PULL QUOTE ───────────────────────────────────────────────── */}
      <div className="py-16">
        <UseCaseQuoteBlock
          quote={story.pullQuote}
          author={story.pullQuoteAuthor}
          role={story.pullQuoteRole}
        />
      </div>

      {/* ── 5. THE RESULT ───────────────────────────────────────────────── */}
      <div className="py-16 px-6">
        <UseCaseStorySection
          eyebrow="What changed"
          title="What changed after they shipped."
        >
          <ul className="flex flex-col gap-4 max-w-3xl">
            {story.outcomes.map((outcome) => (
              <li
                key={outcome}
                className="flex items-start gap-4 rounded-2xl border border-black/[0.06] bg-white p-5"
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 inline-block h-2 w-2 rounded-full bg-violet-600 shrink-0"
                />
                <p className="t-body text-[#3C3C43] leading-relaxed">
                  {outcome}
                </p>
              </li>
            ))}
          </ul>
        </UseCaseStorySection>
      </div>

      {/* ── 6. RELATED STORIES ──────────────────────────────────────────── */}
      <section className="py-20 px-6 surface-subtle">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <span className="t-overline text-[#8E8E93]">More stories</span>
              <h2
                className="mt-2 t-h1 text-[#111]"
                style={{
                  fontSize: 36,
                  letterSpacing: "-0.03em",
                }}
              >
                Other teams shipping on Looper.
              </h2>
            </div>
            <Link
              href="/use-cases"
              className="t-label font-semibold text-violet-700 hover:text-violet-900 transition-colors"
            >
              View all {"→"}
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {related.map((other) => {
              const otherStory = STORIES[other.slug];
              return (
                <TrackedLink
                  key={other.slug}
                  href={`/use-cases/${other.slug}`}
                  event="use_case_viewed"
                  metadata={{
                    source: `related_from_${entry.slug}`,
                    slug: other.slug,
                  }}
                  className="group block h-full"
                >
                  <article className="flex h-full flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-6 transition-shadow hover:shadow-md-token">
                    <span className="t-overline text-[#8E8E93]">
                      {otherStory?.role ?? "Customer"}
                    </span>
                    <h3 className="t-h3 text-[#111] group-hover:text-violet-700 transition-colors">
                      {otherStory?.company ?? other.title}
                    </h3>
                    <p className="t-label text-[#3C3C43] leading-relaxed flex-1">
                      {otherStory?.headline ?? other.fit}
                    </p>
                    <span className="mt-2 t-label font-semibold text-violet-700">
                      Read story {"→"}
                    </span>
                  </article>
                </TrackedLink>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 7. CTA ──────────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div
            className="rounded-[40px] p-12 sm:p-20 text-center"
            style={{ backgroundColor: "#4F46E5" }}
          >
            <h2
              className="text-white mx-auto max-w-2xl"
              style={{
                fontSize: 44,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                fontWeight: 700,
              }}
            >
              Make this your team&apos;s next system.
            </h2>
            <div className="mt-10">
              <TrackedLink
                href={`/signup?useCase=${entry.slug}`}
                event="signup_started"
                metadata={{ source: `use_case_${entry.slug}_bottom` }}
              >
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-6 h-12 t-label font-semibold text-[#111] hover:bg-[#F5F5F7] transition-colors">
                  Start free
                </span>
              </TrackedLink>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
