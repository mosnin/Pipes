import type { Metadata } from "next";
import { MarketingShell } from "@/components/MarketingShell";
import { CutButton } from "@/components/marketing/cut-button";
import { FinalCta } from "@/components/marketing/final-cta";
import { PageIntro } from "@/components/marketing/page-intro";
import { Container, Section, SectionHeading, SpecList } from "@/components/marketing/section";
import { planValues, type Plan } from "@/domain/pipes_schema_v1/schema";
import { getEntitlements, type Entitlements } from "@/domain/templates/plans";
import { cn } from "@/lib/utils";

/* ==========================================================================
   PRICING, /pricing. Public.

   Three plans, read off domain/templates/plans.ts so the page and the gates
   cannot disagree. Plans are set per workspace. No price is typed here:
   checkout belongs to the billing provider, not to a marketing string.
   ========================================================================== */

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Start free with three workflows and simulation. Pro adds shared editing, version history and API and MCP access. Builder adds AI drafting.",
};

const PLAN_COPY: Record<Plan, { summary: string; audience: string }> = {
  Free: {
    summary: "Design and simulate your first procedures on your own.",
    audience: "For one person trying Pipes out.",
  },
  Pro: {
    summary: "Work on procedures together and serve them to your agents.",
    audience: "For teams whose agents read procedures from Pipes.",
  },
  Builder: {
    summary: "More room, and AI that drafts and refactors procedures for review.",
    audience: "For teams running many procedures.",
  },
};

const ROWS: { label: string; key: keyof Entitlements }[] = [
  { label: "Workflows", key: "maxSystems" },
  { label: "Simulation", key: "simulation" },
  { label: "Shared editing and comments", key: "collaboration" },
  { label: "Version history", key: "versionHistory" },
  { label: "API and MCP access", key: "apiMcpAccess" },
  { label: "AI drafting and edit suggestions", key: "aiGeneration" },
];

function features(plan: Plan): string[] {
  const e = getEntitlements(plan);
  return [
    `Up to ${e.maxSystems} workflows`,
    ...ROWS.filter((row) => row.key !== "maxSystems" && e[row.key] === true).map(
      (row) => row.label,
    ),
  ];
}

function cell(value: Entitlements[keyof Entitlements]): string {
  if (typeof value === "number") return String(value);
  return value ? "Included" : "Not included";
}

const QUESTIONS = [
  {
    term: "What counts as a workflow?",
    detail:
      "One procedure in your workspace: its graph, its comments and its versions. Archived workflows still count toward the limit.",
  },
  {
    term: "What happens at the limit?",
    detail:
      "Creating a workflow past your plan's limit stops and asks you to upgrade. Everything you already have stays editable.",
  },
  {
    term: "Is a plan per person?",
    detail:
      "No. A plan belongs to a workspace, and everyone in that workspace works under it.",
  },
  {
    term: "How do I upgrade?",
    detail:
      "From Billing in your workspace settings, once you are signed in. You can start on Free and move up when you need to.",
  },
  {
    term: "Do agents need their own plan?",
    detail:
      "No. Agents call the protocol with tokens issued from your workspace, which needs API and MCP access on Pro or Builder.",
  },
] as const;

export default function PricingPage() {
  return (
    <MarketingShell>
      <PageIntro
        kicker="Pricing"
        title="Start free. Move up when your agents need it."
        lead="Each workspace has its own plan. Free covers designing and simulating a few procedures. Pro adds shared editing, version history and API and MCP access. Builder adds room and AI drafting."
      >
        <div className="flex flex-wrap gap-4">
          <CutButton
            href="/signup?source=pricing"
            track={{ event: "pricing_cta_clicked", metadata: { source: "pricing_primary" } }}
          >
            Start free workspace
          </CutButton>
          <CutButton href="#plans" variant="outline">
            Compare plans
          </CutButton>
        </div>
      </PageIntro>

      <Section id="plans" className="pt-0" labelledBy="plans-heading">
        <Container className="flex flex-col gap-10">
          <SectionHeading id="plans-heading" kicker="Plans" title="Choose what your workspace needs." />
          <ol className="grid gap-5 lg:grid-cols-3">
            {planValues.map((plan) => {
              const featured = plan === "Pro";
              return (
                <li
                  key={plan}
                  className={cn(
                    "flex flex-col gap-7 rounded-12 border bg-raised p-8 shadow-elev-1",
                    featured ? "border-strong" : "border-border",
                  )}
                >
                  <div className="flex flex-col gap-3">
                    <p className="t-label-caps text-ink-3">{plan}</p>
                    <p className="t-mk-h3 text-ink">
                      {getEntitlements(plan).maxSystems} workflows
                    </p>
                    <p className="t-mk-body text-ink-2">{PLAN_COPY[plan].summary}</p>
                  </div>
                  <ul className="flex flex-col gap-3">
                    {features(plan).map((feature) => (
                      <li key={feature} className="t-body flex gap-3 text-ink-2">
                        <span
                          aria-hidden="true"
                          className="mt-[9px] size-[5px] shrink-0 rounded-full bg-ink-4"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex flex-col gap-4">
                    <p className="t-caption text-ink-3">{PLAN_COPY[plan].audience}</p>
                    <CutButton
                      href={plan === "Free" ? "/signup?source=pricing" : "/signup?source=pricing_upgrade"}
                      variant={featured ? "solid" : "outline"}
                      track={{
                        event: "pricing_cta_clicked",
                        metadata: { source: plan === "Free" ? "pricing_primary" : "pricing_secondary", plan },
                      }}
                    >
                      {plan === "Free" ? "Start free workspace" : "Start free, upgrade in the app"}
                    </CutButton>
                  </div>
                </li>
              );
            })}
          </ol>
          <div
            tabIndex={0}
            role="group"
            aria-label="Plan comparison, scrolls sideways"
            className="focus-ring-inset overflow-x-auto rounded-12 border border-border bg-raised shadow-elev-1 outline-none"
          >
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="bg-inset">
                  <th scope="col" className="t-label-caps px-7 py-5 text-left text-ink-3">
                    Limit
                  </th>
                  {planValues.map((plan) => (
                    <th key={plan} scope="col" className="t-label-caps px-7 py-5 text-left text-ink-3">
                      {plan}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {ROWS.map((row) => (
                  <tr key={row.key}>
                    <th scope="row" className="t-body px-7 py-5 text-left font-normal text-ink">
                      {row.label}
                    </th>
                    {planValues.map((plan) => {
                      const value = getEntitlements(plan)[row.key];
                      return (
                        <td
                          key={plan}
                          className={cn(
                            "t-body tabular px-7 py-5",
                            value === false ? "text-ink-4" : "text-ink-2",
                          )}
                        >
                          {cell(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </Section>

      <Section id="questions" className="border-t border-hairline" labelledBy="questions-heading">
        <Container className="flex flex-col gap-10">
          <SectionHeading id="questions-heading" kicker="Questions" title="Before you choose a plan." />
          <SpecList rows={QUESTIONS} className="max-w-[860px]" />
        </Container>
      </Section>

      <FinalCta source="pricing_final" />
    </MarketingShell>
  );
}
