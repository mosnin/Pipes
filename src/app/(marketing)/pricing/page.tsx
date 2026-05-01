import { Fragment } from "react";
import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { SectionBadge } from "@/components/marketing/SectionBadge";

export const metadata = {
  title: "Per seat. Per workspace. Decide later. - Pipes",
  description:
    "Per-workspace pricing. Start free. Pay when your team is ready to ship.",
};

// ─── Plan definitions ─────────────────────────────────────────────────────────

type PlanId = "starter" | "team" | "enterprise";

type Plan = {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  tagline: string;
  highlighted: boolean;
  ctaLabel: string;
  ctaHref: string;
  ctaEvent: string;
  ctaMeta: Record<string, string>;
  ctaTone: "primary" | "secondary";
  features: readonly string[];
};

const PLANS: readonly Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$0",
    period: "free forever",
    tagline: "Explore Pipes and ship your first system.",
    highlighted: false,
    ctaLabel: "Start free",
    ctaTone: "secondary",
    ctaHref: "/signup?source=pricing_starter",
    ctaEvent: "pricing_cta_clicked",
    ctaMeta: { plan: "starter", source: "pricing_cards" },
    features: [
      "Up to 3 systems",
      "Single workspace",
      "Community templates",
      "Validation and simulation",
      "Local export",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "$12",
    period: "per seat / month",
    tagline: "For teams collaborating on shared system memory.",
    highlighted: true,
    ctaLabel: "Start 14-day trial",
    ctaTone: "primary",
    ctaHref: "/signup?source=pricing_team",
    ctaEvent: "pricing_cta_clicked",
    ctaMeta: { plan: "team", source: "pricing_cards" },
    features: [
      "Unlimited systems",
      "Up to 10 collaborators",
      "Priority support",
      "SSO and audit log",
      "MCP and REST protocol access",
      "Pro template library",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "talk to sales",
    tagline: "For teams that need SSO, SCIM, and a signed DPA.",
    highlighted: false,
    ctaLabel: "Contact sales",
    ctaTone: "secondary",
    ctaHref: "/contact?source=pricing_enterprise",
    ctaEvent: "pricing_cta_clicked",
    ctaMeta: { plan: "enterprise", source: "pricing_cards" },
    features: [
      "Unlimited systems and workspaces",
      "SSO, SCIM, and audit log streaming",
      "SOC 2 Type II + DPA",
      "Self-hosted Convex option",
      "Dedicated support engineer",
      "99.9% uptime SLA",
    ],
  },
] as const;

// ─── Feature comparison ───────────────────────────────────────────────────────

type CellValue = string | boolean;

type ComparisonGroup = {
  group: string;
  rows: readonly {
    feature: string;
    starter: CellValue;
    team: CellValue;
    enterprise: CellValue;
  }[];
};

const COMPARISON: readonly ComparisonGroup[] = [
  {
    group: "Workspace",
    rows: [
      { feature: "Systems",                starter: "3",     team: "25",   enterprise: "Unlimited" },
      { feature: "Collaborators",          starter: "1",     team: "Unlimited", enterprise: "Unlimited" },
      { feature: "Version history",        starter: false,   team: true,    enterprise: true },
      { feature: "Comments and review",    starter: false,   team: true,    enterprise: true },
    ],
  },
  {
    group: "Authoring",
    rows: [
      { feature: "Validation engine",      starter: "Basic", team: "Advanced", enterprise: "Advanced" },
      { feature: "Simulation",             starter: true,    team: true,    enterprise: true },
      { feature: "Pro template library",   starter: false,   team: true,    enterprise: true },
      { feature: "AI system generation",   starter: false,   team: false,    enterprise: true },
      { feature: "AI edit suggestions",    starter: false,   team: false,    enterprise: true },
      { feature: "Sub-agent builder",      starter: false,   team: false,    enterprise: true },
    ],
  },
  {
    group: "Protocol",
    rows: [
      { feature: "MCP and REST access",    starter: false,   team: true,    enterprise: true },
      { feature: "Capability-scoped tokens", starter: false, team: "Limited",  enterprise: true },
      { feature: "Idempotency keys",       starter: false,   team: true,    enterprise: true },
      { feature: "Audit log export",       starter: false,   team: false,    enterprise: true },
    ],
  },
  {
    group: "Security and support",
    rows: [
      { feature: "SSO / SAML",             starter: false,   team: false,   enterprise: true },
      { feature: "SCIM provisioning",      starter: false,   team: false,   enterprise: true },
      { feature: "SOC 2 Type II",          starter: true,    team: true,    enterprise: true },
      { feature: "DPA",                    starter: false,   team: true,    enterprise: true },
      { feature: "Self-hosted Convex",     starter: false,   team: false,   enterprise: true },
      { feature: "Uptime SLA",             starter: "-",     team: "99.5%", enterprise: "99.9%" },
    ],
  },
] as const;

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const FAQS = [
  {
    id: "faq-free",
    question: "Is the Starter plan really free?",
    answer:
      "Yes, with no time limit. Build up to 3 systems, run validations, and export locally. Upgrade when you outgrow it.",
  },
  {
    id: "faq-workspace",
    question: "What counts as a workspace?",
    answer:
      "A workspace is a shared environment where you and your collaborators design systems together. Team plans bill per active seat.",
  },
  {
    id: "faq-upgrade",
    question: "Can I change plans at any time?",
    answer:
      "Yes. Upgrades take effect immediately. Downgrades apply at the end of the current billing cycle. Systems above the new limit become read-only.",
  },
  {
    id: "faq-mcp",
    question: "What is the Pipes Protocol?",
    answer:
      "A token-authenticated MCP and REST surface over the same bounded service layer. External agents and tools can read your system contracts without your team re-prompting them.",
  },
  {
    id: "faq-enterprise",
    question: "What does Enterprise include?",
    answer:
      "SSO, SCIM, audit log streaming, a signed DPA, an uptime SLA, and a self-hosted Convex option for sensitive deployments. Talk to sales for procurement and security questionnaires.",
  },
  {
    id: "faq-trial",
    question: "Do paid plans have a trial?",
    answer:
      "Team includes a 14-day trial. No credit card required to start, and your work persists if you do not upgrade.",
  },
] as const;

// ─── Cell renderer ────────────────────────────────────────────────────────────

function ComparisonCell({ value }: { value: CellValue }) {
  if (typeof value === "string") {
    return <span className="t-label font-medium text-[#111]">{value}</span>;
  }
  if (value) {
    return (
      <Check
        size={16}
        className="mx-auto text-indigo-600"
        aria-label="Included"
      />
    );
  }
  return (
    <Minus
      size={14}
      className="mx-auto text-[#C7C7CC]"
      aria-label="Not included"
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── 1. HEADER ───────────────────────────────────────────────────── */}
      <section className="border-b border-black/[0.06] bg-white pt-20 pb-14 px-6 text-center">
        <h1
          className="t-display text-[#111] mx-auto max-w-3xl"
          style={{ fontSize: 52, lineHeight: 1.05, letterSpacing: "-0.035em" }}
        >
          Per seat. Per workspace. Decide later.
        </h1>
        <p className="mt-5 mx-auto max-w-xl t-body text-[#3C3C43]">
          Start free, pay when your team is ready to ship.
        </p>
      </section>

      {/* ── 2. PRICING CARDS ────────────────────────────────────────────── */}
      <section className="surface-subtle border-b border-black/[0.06] py-16 px-6">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4 items-stretch">
          {PLANS.map((plan) => {
            const isHighlighted = plan.highlighted;
            return (
              <div
                key={plan.id}
                className={[
                  "relative flex flex-col rounded-[16px] bg-white",
                  isHighlighted
                    ? "border-2 border-indigo-600 shadow-md-token"
                    : "border border-black/[0.08]",
                ].join(" ")}
              >
                {isHighlighted && (
                  <div className="absolute -top-3 left-6">
                    <span className="inline-flex items-center rounded-full bg-indigo-600 px-2.5 py-1 t-micro font-semibold uppercase tracking-[0.08em] text-white">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="p-6 flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="t-overline text-[#8E8E93]">
                      {plan.name}
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span
                        className="text-[#111] t-num"
                        style={{
                          fontSize: 36,
                          fontWeight: 700,
                          letterSpacing: "-0.03em",
                        }}
                      >
                        {plan.price}
                      </span>
                    </div>
                    <span className="t-caption text-[#8E8E93]">{plan.period}</span>
                  </div>
                  <p className="t-label text-[#3C3C43] leading-snug min-h-[2.5rem]">
                    {plan.tagline}
                  </p>
                  <TrackedLink
                    href={plan.ctaHref}
                    event={plan.ctaEvent}
                    metadata={plan.ctaMeta}
                    className="block w-full"
                  >
                    <span
                      className={[
                        "inline-flex w-full items-center justify-center gap-1.5 rounded-md h-10 px-4 t-label font-semibold transition-colors",
                        plan.ctaTone === "primary"
                          ? "bg-[#111] text-white hover:bg-indigo-700"
                          : "border border-black/[0.14] bg-white text-[#111] hover:border-black/[0.24] hover:bg-black/[0.02]",
                      ].join(" ")}
                    >
                      {plan.ctaLabel}
                      <ArrowRight size={13} aria-hidden="true" />
                    </span>
                  </TrackedLink>
                </div>

                <div className="border-t border-black/[0.06] p-6 flex-1">
                  <ul className="flex flex-col gap-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 t-label text-[#3C3C43]"
                      >
                        <Check
                          size={15}
                          className="mt-0.5 shrink-0 text-indigo-600"
                          aria-hidden="true"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3. FEATURE COMPARISON TABLE ─────────────────────────────────── */}
      <section className="border-b border-black/[0.06] bg-white py-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <SectionBadge label="Compare" />
            <h2
              className="mt-4 t-h1 text-[#111]"
              style={{ letterSpacing: "-0.025em" }}
            >
              Every feature, side by side.
            </h2>
          </div>

          <div className="overflow-x-auto rounded-[12px] border border-black/[0.08] bg-white">
            <table className="w-full text-left t-label">
              <thead>
                <tr className="border-b border-black/[0.08] bg-[#FAFAFA]">
                  <th className="px-5 py-4 t-overline text-[#8E8E93] w-[40%]">
                    Feature
                  </th>
                  <th className="px-4 py-4 text-center t-overline text-[#8E8E93]">
                    Starter
                  </th>
                  <th className="px-4 py-4 text-center t-overline text-indigo-700">
                    Team
                  </th>
                  <th className="px-4 py-4 text-center t-overline text-[#8E8E93]">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((group) => (
                  <Fragment key={`g-${group.group}`}>
                    <tr className="bg-[#FAFAFA]">
                      <td
                        colSpan={5}
                        className="px-5 py-2.5 t-overline text-[#3C3C43]"
                      >
                        {group.group}
                      </td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr
                        key={`${group.group}-${row.feature}`}
                        className="border-t border-black/[0.06]"
                      >
                        <td className="px-5 py-3 t-label text-[#3C3C43]">
                          {row.feature}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ComparisonCell value={row.starter} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ComparisonCell value={row.team} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ComparisonCell value={row.enterprise} />
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 4. FAQ ──────────────────────────────────────────────────────── */}
      <section className="border-b border-black/[0.06] bg-white py-20 px-6">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <SectionBadge label="FAQ" />
            <h2
              className="mt-4 t-h1 text-[#111]"
              style={{ letterSpacing: "-0.025em" }}
            >
              Questions, answered.
            </h2>
          </div>

          <div className="rounded-[12px] border border-black/[0.08] bg-white divide-y divide-black/[0.06]">
            {FAQS.map((faq) => (
              <details
                key={faq.id}
                className="group p-5 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 list-none">
                  <span className="t-label font-semibold text-[#111]">
                    {faq.question}
                  </span>
                  <span
                    aria-hidden="true"
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-black/[0.08] text-[#8E8E93] transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 t-label text-[#3C3C43] leading-relaxed">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. BOTTOM CTA ───────────────────────────────────────────────── */}
      <section className="surface-inverse">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2
            className="text-white mx-auto max-w-2xl"
            style={{
              fontSize: 36,
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              fontWeight: 700,
            }}
          >
            Ship your first system this week.
          </h2>
          <p className="mt-4 mx-auto max-w-md t-body text-[#C7C7CC]">
            Start on Starter. Upgrade when your team is ready.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <TrackedLink
              href="/signup?source=pricing_bottom_cta"
              event="pricing_cta_clicked"
              metadata={{ source: "pricing_bottom_cta" }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-5 h-11 t-label font-semibold text-[#111] hover:bg-[#F5F5F7] transition-colors">
                Start free
                <ArrowRight size={14} aria-hidden="true" />
              </span>
            </TrackedLink>
            <Link href="/contact?source=pricing_bottom_sales">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-transparent px-5 h-11 t-label font-semibold text-white hover:border-white/40 hover:bg-white/[0.04] transition-colors">
                Talk to sales
              </span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
