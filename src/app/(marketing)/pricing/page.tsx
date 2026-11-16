import type { Metadata } from "next";
import { MarketingShell } from "@/components/MarketingShell";
import { CutButton } from "@/components/marketing/cut-button";
import { FinalCta } from "@/components/marketing/final-cta";
import { PageIntro } from "@/components/marketing/page-intro";
import { Container, Section, SectionHeading, SpecList } from "@/components/marketing/section";
import { planValues, type Plan } from "@/domain/pipes_schema_v1/schema";
import { getEntitlements, type Entitlements } from "@/domain/templates/plans";
import { MONTHLY_INCLUDED, OVERAGE_CENTS } from "@/domain/usage/service";
import { cn } from "@/lib/utils";

/* ==========================================================================
   PRICING, /pricing. Public.

   Three plans, read off domain/templates/plans.ts and the allowances in
   domain/usage/service.ts, so the page and the gates cannot disagree. Plans
   are set per workspace. No plan price is typed here: checkout belongs to
   the billing provider, not to a marketing string.
   ========================================================================== */

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Every plan includes monthly runs, steps and calls. Free stops when its runs are used; Pro and Builder keep running and bill usage past the allowance. API and MCP access start on Pro, AI drafting on Builder.",
};

type Allowance = keyof typeof OVERAGE_CENTS;

const PLAN_COPY: Record<Plan, { summary: string; audience: string }> = {
  Free: {
    summary: "Design a few workflows and run them yourself from the app.",
    audience: "For one person trying Pipes out.",
  },
  Pro: {
    summary: "Work on workflows together and let your agents run them over MCP.",
    audience: "For teams whose agents run workflows from Pipes.",
  },
  Builder: {
    summary: "More room, more runs, and AI that drafts and edits workflows for review.",
    audience: "For teams running many workflows.",
  },
};

const ALLOWANCES: { key: Allowance; plural: string; row: string; unit: string }[] = [
  { key: "runs", plural: "runs", row: "Runs each month", unit: "runs" },
  { key: "steps", plural: "steps", row: "Steps each month", unit: "steps" },
  { key: "calls", plural: "API, MCP and webhook calls", row: "Calls each month", unit: "calls" },
];

const FEATURE_ROWS: { label: string; key: Exclude<keyof Entitlements, "maxSystems"> }[] = [
  { label: "Simulation", key: "simulation" },
  { label: "Shared editing and comments", key: "collaboration" },
  { label: "Version history", key: "versionHistory" },
  { label: "API and MCP access", key: "apiMcpAccess" },
  { label: "AI drafting and edit suggestions", key: "aiGeneration" },
];

const number = new Intl.NumberFormat("en-US");

/** OVERAGE_CENTS is per unit in US cents; people read it per thousand. */
function perThousand(key: Allowance): string {
  return `$${((OVERAGE_CENTS[key] * 1000) / 100).toFixed(2)}`;
}

function features(plan: Plan): string[] {
  const e = getEntitlements(plan);
  const included = MONTHLY_INCLUDED[plan];
  return [
    `Up to ${e.maxSystems} workflows`,
    // Runs are the card's headline, so the list starts at steps.
    ...ALLOWANCES.filter((a) => a.key !== "runs").map(
      (a) => `${number.format(included[a.key])} ${a.plural} a month`,
    ),
    ...FEATURE_ROWS.filter((row) => e[row.key]).map((row) => row.label),
  ];
}

function beyond(plan: Plan): string {
  return plan === "Free" ? "New runs stop until next month" : "Keeps running, billed per use";
}

type Row = { label: string; value: (plan: Plan) => string; muted?: (plan: Plan) => boolean };

const TABLE: Row[] = [
  { label: "Workflows", value: (plan) => number.format(getEntitlements(plan).maxSystems) },
  ...ALLOWANCES.map((a) => ({
    label: a.row,
    value: (plan: Plan) => number.format(MONTHLY_INCLUDED[plan][a.key]),
  })),
  { label: "Past the allowance", value: beyond },
  ...FEATURE_ROWS.map((row) => ({
    label: row.label,
    value: (plan: Plan) => (getEntitlements(plan)[row.key] ? "Included" : "Not included"),
    muted: (plan: Plan) => !getEntitlements(plan)[row.key],
  })),
];

const QUESTIONS = [
  {
    term: "What counts as a run, a step and a call?",
    detail:
      "A run is one pass through a workflow, however it started: from the app, by an agent, from a webhook or on a schedule. A step is one step completed in a run. A call is one API request made with a token, one MCP request or one inbound webhook.",
  },
  {
    term: "What happens when Free runs out?",
    detail:
      "New runs stop until the next calendar month, and Pipes says why when you try to start one. Your workflows, run history and settings stay as they are.",
  },
  {
    term: "And past the allowance on Pro or Builder?",
    detail:
      "Runs keep going. Usage past the monthly allowance is billed at the rates above, and Settings, Usage shows where the month stands.",
  },
  {
    term: "What counts as a workflow?",
    detail:
      "One workflow in your workspace: its steps, its comments and its versions. Archived workflows still count toward the limit.",
  },
  {
    term: "What happens at the workflow limit?",
    detail:
      "Creating a workflow past your plan's limit stops and asks you to upgrade. Everything you already have stays editable.",
  },
  {
    term: "Is a plan per person?",
    detail: "No. A plan belongs to a workspace, and everyone in that workspace works under it.",
  },
  {
    term: "Do agents need their own plan?",
    detail:
      "No. Agents connect with tokens from your workspace, which needs API and MCP access on Pro or Builder.",
  },
  {
    term: "How do I upgrade?",
    detail:
      "From Billing in your workspace settings, once you are signed in. You can start on Free and move up when you need to.",
  },
] as const;

export default function PricingPage() {
  return (
    <MarketingShell>
      <PageIntro
        kicker="Pricing"
        title="Start free. Move up when your agents need it."
        lead="Each workspace has its own plan, with a monthly allowance of runs, steps and calls. Free stops when its runs are used. Pro adds shared editing, version history and API and MCP access, and keeps running past the allowance. Builder adds room and AI drafting."
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
                      {number.format(MONTHLY_INCLUDED[plan].runs)} runs a month
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
                    <p className="t-caption text-ink-3">
                      {plan === "Free"
                        ? "When the month's runs are used, new runs stop until next month."
                        : "Past the allowance, runs keep going and usage is billed."}{" "}
                      {PLAN_COPY[plan].audience}
                    </p>
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
                {TABLE.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="t-body px-7 py-5 text-left font-normal text-ink">
                      {row.label}
                    </th>
                    {planValues.map((plan) => (
                      <td
                        key={plan}
                        className={cn(
                          "t-body tabular px-7 py-5",
                          row.muted?.(plan) ? "text-ink-4" : "text-ink-2",
                        )}
                      >
                        {row.value(plan)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </Section>

      <Section id="usage" className="border-t border-hairline" labelledBy="usage-heading">
        <Container className="flex flex-col gap-10">
          <SectionHeading
            id="usage-heading"
            kicker="Past the allowance"
            title="Pro and Builder pay for what they use beyond it."
            lead="The same rates apply on both paid plans. Free does not bill usage: once its runs are used, new runs wait for the next month."
          />
          <SpecList
            className="max-w-[860px]"
            rows={ALLOWANCES.map((a) => ({
              term: a.row.replace(" each month", ""),
              detail: `${perThousand(a.key)} per 1,000 ${a.unit} past the allowance.`,
            }))}
          />
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
