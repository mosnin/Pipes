import Link from "next/link";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { SectionBadge } from "@/components/marketing/SectionBadge";
import { PricingHeroAndTiers } from "@/components/marketing/PricingHeroAndTiers";
import { PricingComparisonTable } from "@/components/marketing/PricingComparisonTable";
import { PricingFaq } from "@/components/marketing/PricingFaq";
import type { PricingTier } from "@/components/marketing/PricingTiersGrid";
import type { ComparisonGroup } from "@/components/marketing/PricingComparisonTable";
import type { FaqItem } from "@/components/marketing/PricingFaq";

export const metadata = {
  title: "Per seat. Per workspace. Decide later. - Looper",
  description:
    "Per-workspace pricing. Start free. Pay only when your team is ready to ship.",
};

// ─── Tier data ────────────────────────────────────────────────────────────────

const TIERS: readonly PricingTier[] = [
  {
    id: "starter",
    name: "Free",
    description:
      "Build loops with AI. 50 agent builds/month. Public loops only. No credit card.",
    monthlyPrice: "$0",
    yearlyPrice: "$0",
    monthlyPeriod: "free, forever",
    yearlyPeriod: "free, forever",
    highlighted: false,
    ctaLabel: "Start free",
    ctaHref: "/signup?source=pricing_starter",
    ctaEvent: "pricing_cta_clicked",
    ctaMeta: { plan: "starter", source: "pricing_cards" },
    ctaTone: "secondary",
    features: [
      "3 public loops",
      "50 agent builds/month",
      "Loop canvas and editing",
      "Validation and simulation",
      "Community loop starters",
      "JSON + Markdown export",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description:
      "Unlimited private loops, version history, and MCP write access.",
    monthlyPrice: "$29",
    yearlyPrice: "$24",
    monthlyPeriod: "per month",
    yearlyPeriod: "per month, billed yearly",
    highlighted: true,
    ctaLabel: "Start 14-day trial",
    ctaHref: "/signup?source=pricing_pro",
    ctaEvent: "pricing_cta_clicked",
    ctaMeta: { plan: "pro", source: "pricing_cards" },
    ctaTone: "primary",
    features: [
      "Unlimited private loops",
      "Unlimited agent builds",
      "Full version history",
      "MCP read + write tokens",
      "Loop analytics",
      "Marketplace selling",
      "14-day trial, no card",
    ],
  },
  {
    id: "team",
    name: "Team",
    description:
      "For teams building loops together with SSO, audit log, and a private registry.",
    monthlyPrice: "$99",
    yearlyPrice: "$84",
    monthlyPeriod: "per month, up to 10 seats",
    yearlyPeriod: "per month, billed yearly, up to 10 seats",
    highlighted: false,
    ctaLabel: "Start 14-day trial",
    ctaHref: "/signup?source=pricing_team",
    ctaEvent: "pricing_cta_clicked",
    ctaMeta: { plan: "team", source: "pricing_cards" },
    ctaTone: "secondary",
    features: [
      "Everything in Pro",
      "Up to 10 seats",
      "SSO (SAML)",
      "Audit log",
      "Private loop registry",
      "Priority support",
      "14-day trial, no card",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description:
      "For teams that need SCIM, a signed DPA, custom seats, and SLA.",
    monthlyPrice: "Custom",
    yearlyPrice: "Custom",
    monthlyPeriod: "talk to sales",
    yearlyPeriod: "talk to sales",
    highlighted: false,
    ctaLabel: "Contact sales",
    ctaHref: "/contact?source=pricing_enterprise",
    ctaEvent: "pricing_cta_clicked",
    ctaMeta: { plan: "enterprise", source: "pricing_cards" },
    ctaTone: "secondary",
    features: [
      "Everything in Team",
      "Unlimited seats",
      "SAML SSO + SCIM provisioning",
      "Audit log streaming",
      "SOC 2 Type II + signed DPA",
      "99.9% uptime SLA",
      "Dedicated support engineer",
    ],
  },
] as const;

// ─── Comparison data ──────────────────────────────────────────────────────────

const COMPARISON: readonly ComparisonGroup[] = [
  {
    title: "Loops",
    rows: [
      {
        feature: "Public loops",
        detail: "Loops visible to anyone on the marketplace.",
        starter: "3",
        pro: "Unlimited",
        team: "Unlimited",
        enterprise: "Unlimited",
      },
      {
        feature: "Private loops",
        starter: "0",
        pro: "Unlimited",
        team: "Unlimited",
        enterprise: "Unlimited",
      },
      {
        feature: "AI-assisted builds per month",
        detail: "One build = one prompt the agent acts on.",
        starter: "50/month",
        pro: "Unlimited",
        team: "Unlimited",
        enterprise: "Unlimited",
      },
      {
        feature: "Collaborators",
        starter: "1",
        pro: "1",
        team: "10 seats",
        enterprise: "Unlimited",
      },
      {
        feature: "Versioned loop history",
        detail: "Named checkpoints you can restore at any time.",
        starter: false,
        pro: "Unlimited",
        team: "Unlimited",
        enterprise: "Unlimited",
      },
      {
        feature: "Comments and review",
        starter: false,
        pro: true,
        team: true,
        enterprise: true,
      },
      {
        feature: "Cmd-Z undoes a whole agent turn",
        starter: true,
        pro: true,
        team: true,
        enterprise: true,
      },
    ],
  },
  {
    title: "Authoring",
    rows: [
      {
        feature: "Validation engine",
        detail: "Type-checks every node, port, and pipe.",
        starter: "Basic",
        pro: "Advanced",
        team: "Advanced",
        enterprise: "Advanced",
      },
      {
        feature: "Simulation",
        starter: true,
        pro: true,
        team: true,
        enterprise: true,
      },
      {
        feature: "AI-assisted generation",
        detail: "Agent draws the loop from your description.",
        starter: false,
        pro: true,
        team: true,
        enterprise: true,
      },
      {
        feature: "Starter library",
        starter: "Public",
        pro: "Public",
        team: "Public + private",
        enterprise: "Public + private",
      },
      {
        feature: "Custom node config schemas",
        starter: false,
        pro: false,
        team: true,
        enterprise: true,
      },
      {
        feature: "Bring your own model keys",
        starter: false,
        pro: false,
        team: true,
        enterprise: true,
      },
    ],
  },
  {
    title: "Protocol",
    rows: [
      {
        feature: "MCP read endpoint",
        detail: "Hand any agent a token. It reads the same graph.",
        starter: false,
        pro: true,
        team: true,
        enterprise: true,
      },
      {
        feature: "REST endpoint",
        starter: false,
        pro: true,
        team: true,
        enterprise: true,
      },
      {
        feature: "Marketplace selling",
        detail: "Publish loops and earn on every install.",
        starter: false,
        pro: true,
        team: true,
        enterprise: true,
      },
      {
        feature: "Capability-scoped tokens",
        starter: false,
        pro: { kind: "limited", label: "Limited" },
        team: true,
        enterprise: true,
      },
      {
        feature: "Idempotency keys",
        starter: false,
        pro: true,
        team: true,
        enterprise: true,
      },
      {
        feature: "Audit log export",
        starter: false,
        pro: false,
        team: false,
        enterprise: true,
      },
    ],
  },
  {
    title: "Support",
    rows: [
      {
        feature: "Community Slack",
        starter: true,
        pro: true,
        team: true,
        enterprise: true,
      },
      {
        feature: "Priority email",
        starter: false,
        pro: false,
        team: true,
        enterprise: true,
      },
      {
        feature: "Dedicated support engineer",
        starter: false,
        pro: false,
        team: false,
        enterprise: true,
      },
      {
        feature: "Uptime SLA",
        starter: "–",
        pro: "–",
        team: "99.5%",
        enterprise: "99.9%",
      },
    ],
  },
  {
    title: "Security and compliance",
    rows: [
      {
        feature: "SAML SSO",
        starter: false,
        pro: false,
        team: true,
        enterprise: true,
      },
      {
        feature: "SCIM provisioning",
        starter: false,
        pro: false,
        team: false,
        enterprise: true,
      },
      {
        feature: "SOC 2 Type II",
        starter: true,
        pro: true,
        team: true,
        enterprise: true,
      },
      {
        feature: "Signed DPA",
        starter: false,
        pro: false,
        team: true,
        enterprise: true,
      },
      {
        feature: "Self-hosted Convex",
        starter: false,
        pro: false,
        team: false,
        enterprise: true,
      },
      {
        feature: "Data residency choice",
        starter: false,
        pro: false,
        team: false,
        enterprise: true,
      },
    ],
  },
] as const;

// ─── Built-into-every-tier panel ──────────────────────────────────────────────

const EVERY_TIER = [
  {
    title: "One typed graph",
    body: "Every node, port, and pipe is typed. The same map your team reviews is the one your agents read.",
  },
  {
    title: "MCP-ready by design",
    body: "Hand any agent a token. It reads through the Looper Protocol. No bespoke client to ship.",
  },
  {
    title: "Optimistic edits",
    body: "Drag a node, the agent yields. Edits land instantly. Cmd-Z undoes the whole agent turn.",
  },
  {
    title: "Plan-first agent",
    body: "The agent plans before it draws. You see what it intends, not just what it did.",
  },
] as const;


// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQS: readonly FaqItem[] = [
  {
    id: "faq-build",
    question: "What counts as a build?",
    answer:
      "Every prompt the agent acts on counts as one build. If you hit return and the agent draws or edits a node, that is one build. Editing the canvas by hand never counts. Reading the graph through the protocol never counts.",
  },
  {
    id: "faq-cap",
    question: "What happens if I exceed my monthly builds?",
    answer:
      "On Free, you get 50 AI-assisted builds per month. Manual canvas editing never counts toward the cap. Once you hit 50, upgrade to Pro and builds restart immediately with no lost state.",
  },
  {
    id: "faq-keys",
    question: "Can I bring my own model keys?",
    answer:
      "On Team and Enterprise, yes. Drop in your OpenAI or Anthropic key per workspace. Bills land on your provider, not on us. Free uses our shared key; Pro includes unlimited AI builds on our key.",
  },
  {
    id: "faq-trial",
    question: "Is there a trial?",
    answer:
      "Team includes a 14-day trial. No card required. Your work and seats persist if you do not upgrade. You are never blocked from your own graphs.",
  },
  {
    id: "faq-seats",
    question: "How do seats work on Team?",
    answer:
      "You pay per active seat per month. Viewers are free. A seat is anyone who can describe a system or edit the canvas. Downgrade a seat to viewer any time.",
  },
  {
    id: "faq-mcp",
    question: "What is the Looper Protocol?",
    answer:
      "A token-authenticated read and write surface for the same graph the agent built. MCP and REST. Every external agent and tool reads the same contract your team reviewed.",
  },
  {
    id: "faq-downgrade",
    question: "What if I downgrade?",
    answer:
      "Downgrades take effect at the end of your current cycle. Any systems above the new tier limit become read-only until you remove or upgrade. Nothing is deleted.",
  },
  {
    id: "faq-enterprise",
    question: "What does Enterprise include that Team does not?",
    answer:
      "SAML SSO, SCIM provisioning, signed DPA, audit log streaming, data residency, a self-hosted Convex option, a 99.9% uptime SLA, and a dedicated support engineer.",
  },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="bg-white">
      {/* ── 1. HERO + TIERS ─────────────────────────────────────────────── */}
      <section className="px-6 pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="surface-subtle rounded-[40px] border border-black/[0.06] py-24 sm:py-32 px-6">
            <div className="mx-auto max-w-3xl text-center">
              <SectionBadge label="Pricing" />
              <h1
                className="mt-6 text-[#111] mx-auto"
                style={{
                  fontSize: 64,
                  lineHeight: 1.02,
                  letterSpacing: "-0.04em",
                  fontWeight: 700,
                }}
              >
                Per seat. Per workspace. Decide later.
              </h1>
              <p className="mt-6 t-body text-[#3C3C43] mx-auto max-w-xl leading-relaxed">
                Start free. Upgrade when your team is ready to ship. Every tier
                speaks the same protocol your agents read.
              </p>
              <div className="mt-12">
                <PricingHeroAndTiers tiers={TIERS} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. COMPARISON TABLE ─────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <SectionBadge label="Compare" />
            <h2
              className="mt-4 text-[#111] mx-auto max-w-2xl"
              style={{
                fontSize: 44,
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                fontWeight: 700,
              }}
            >
              The whole product. Side by side.
            </h2>
            <p className="mt-4 t-body text-[#3C3C43] mx-auto max-w-xl">
              Every limit, every protocol surface, every compliance line. No
              fine print at the bottom.
            </p>
          </div>
          <PricingComparisonTable groups={COMPARISON} />
        </div>
      </section>

      {/* ── 4. BUILT INTO EVERY TIER ────────────────────────────────────── */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="surface-subtle rounded-[40px] border border-black/[0.06] p-10 sm:p-16">
            <div className="mb-10 text-center">
              <SectionBadge label="Built in" />
              <h2
                className="mt-4 text-[#111] mx-auto max-w-2xl"
                style={{
                  fontSize: 36,
                  lineHeight: 1.1,
                  letterSpacing: "-0.025em",
                  fontWeight: 700,
                }}
              >
                These ship on every tier.
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {EVERY_TIER.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-black/[0.06] bg-white p-6 flex flex-col gap-2"
                >
                  <h3 className="t-title text-[#111]">{feature.title}</h3>
                  <p className="t-label text-[#3C3C43] leading-relaxed">
                    {feature.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. CTA STRIP ────────────────────────────────────────────────── */}
      <section className="px-6 py-16 border-t border-black/[0.06]">
        <div className="mx-auto max-w-2xl text-center flex flex-col items-center gap-4">
          <p className="t-overline text-[#8E8E93]">Ready to build?</p>
          <h3 className="text-[28px] font-bold leading-tight text-[#111]" style={{ letterSpacing: "-0.02em" }}>
            Join builders shipping agent loops with Looper.
          </h3>
          <p className="t-body text-[#3C3C43] max-w-md">
            Free to start. No card required. Describe your first loop in one sentence.
          </p>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-[#111] text-white rounded-xl px-6 py-3 t-label font-semibold hover:bg-[#222] transition-colors"
          >
            Start building free
          </a>
        </div>
      </section>

      {/* ── 6. FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <SectionBadge label="FAQ" />
            <h2
              className="mt-4 text-[#111] mx-auto"
              style={{
                fontSize: 44,
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                fontWeight: 700,
              }}
            >
              Questions, answered.
            </h2>
          </div>
          <PricingFaq items={FAQS} />
        </div>
      </section>

      {/* ── 7. FINAL CTA ────────────────────────────────────────────────── */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="surface-inverse rounded-[40px] p-12 sm:p-20 text-center">
            <h2
              className="text-white mx-auto max-w-2xl"
              style={{
                fontSize: 52,
                lineHeight: 1.05,
                letterSpacing: "-0.035em",
                fontWeight: 700,
              }}
            >
              Start free. Pay only when you scale.
            </h2>
            <p className="mt-5 mx-auto max-w-lg t-body text-[#C7C7CC]">
              Start with 3 public loops for free. AI-assisted builds unlock on Pro.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <TrackedLink
                href="/signup?source=pricing_bottom_cta"
                event="pricing_cta_clicked"
                metadata={{ source: "pricing_bottom_cta" }}
              >
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-6 h-12 t-label font-semibold text-[#111] hover:bg-[#F5F5F7] transition-colors">
                  Start free
                </span>
              </TrackedLink>
              <Link
                href="/contact?source=pricing_bottom_sales"
                className="t-label font-medium text-white/80 hover:text-white transition-colors"
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
