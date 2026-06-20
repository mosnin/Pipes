import Link from "next/link";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { SectionBadge } from "@/components/marketing/SectionBadge";
import { UseCaseGrid, type UseCaseCard } from "@/components/marketing/UseCaseGrid";

export const metadata = {
  title: "Teams shipping multi-agent systems - Looper",
  description:
    "Teams shipping multi-agent systems, automation flows, and support operations on Looper.",
};

// Persona + company placeholders, paired to the slugs in lib/public/content.
// Companies are invented and clearly placeholder, but feel real.
const PERSONA_BY_SLUG: Record<
  string,
  { persona: string; role: string; company: string; outcome: string }
> = {
  "multi-agent-systems": {
    persona: "Maya Reyes",
    role: "Staff engineer",
    company: "Northwind Robotics",
    outcome:
      "Planners, specialists, and reviewers ship through one typed contract. Three days from sketch to first run.",
  },
  "automation-workflows": {
    persona: "Daniel Park",
    role: "Platform lead",
    company: "Quay & Co",
    outcome:
      "Triggers, branches, and side effects sit on one map. No more chasing a Jira ticket to read a flow.",
  },
  "support-operations": {
    persona: "Lina Vargas",
    role: "Head of support",
    company: "Lumen Health",
    outcome:
      "Triage, policy checks, and approval points captured in plain text. The on-call reads the same map the bot reads.",
  },
  "technical-system-design": {
    persona: "Theo Hartmann",
    role: "Tech lead",
    company: "Arc Systems",
    outcome:
      "Architecture and implementation share one map. RFC reviews finished in one sitting instead of three.",
  },
  "agency-handoff": {
    persona: "Olivia Chen",
    role: "Principal consultant",
    company: "Glasshouse Studio",
    outcome:
      "Clients receive a transferable system, not a PDF. Hand over a token. They keep building.",
  },
};

export default function UseCasesPage() {
  const cases = publicContentService.listUseCases();
  const templates = publicContentService.listTemplates();

  const cards: UseCaseCard[] = cases.map((entry) => {
    const meta = PERSONA_BY_SLUG[entry.slug] ?? {
      persona: "Staff engineer",
      role: "Staff engineer",
      company: entry.title,
      outcome: entry.fit,
    };
    return {
      slug: entry.slug,
      persona: meta.persona,
      role: meta.role,
      company: meta.company,
      outcome: meta.outcome,
      templates: templates.filter((t) =>
        (entry.templateIds as readonly string[]).includes(t.id),
      ).length,
    };
  });

  return (
    <div className="bg-white">
      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section className="px-6 pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="surface-subtle rounded-[40px] border border-black/[0.06] py-24 sm:py-32 px-6 text-center">
            <SectionBadge label="Customer stories" />
            <h1
              className="mt-6 text-[#111] mx-auto max-w-3xl"
              style={{
                fontSize: 60,
                lineHeight: 1.04,
                letterSpacing: "-0.04em",
                fontWeight: 700,
              }}
            >
              Teams shipping multi-agent systems on Looper.
            </h1>
            <p className="mt-6 t-body text-[#3C3C43] mx-auto max-w-xl leading-relaxed">
              Built in conversation, not on a whiteboard. Five teams. Five
              workloads. One typed graph their agents read.
            </p>
          </div>
        </div>
      </section>

      {/* ── 2. GRID ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <UseCaseGrid cards={cards} />
        </div>
      </section>

      {/* ── 3. CTA STRIP ────────────────────────────────────────────────── */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[40px] bg-indigo-50 border border-indigo-100 p-10 sm:p-16 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            <div className="flex-1">
              <h2
                className="text-[#111] max-w-2xl"
                style={{
                  fontSize: 36,
                  lineHeight: 1.1,
                  letterSpacing: "-0.025em",
                  fontWeight: 700,
                }}
              >
                Build your own. Start a system.
              </h2>
              <p className="mt-3 t-body text-[#3C3C43] max-w-lg">
                Describe yours in one sentence. Watch the agent draw it. Hand it
                to your team before the next standup.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4 shrink-0">
              <TrackedLink
                href="/signup?source=use_cases_cta"
                event="use_cases_cta_clicked"
                metadata={{ location: "use_cases_bottom" }}
              >
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#111] px-6 h-12 t-label font-semibold text-white hover:bg-indigo-700 transition-colors">
                  Start free
                </span>
              </TrackedLink>
              <Link
                href="/contact?source=use_cases_contact"
                className="t-label font-semibold text-indigo-700 hover:text-indigo-900 transition-colors"
              >
                Talk to sales {"→"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
