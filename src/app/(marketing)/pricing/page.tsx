import { Accordion, Button, Card, Chip, Separator } from "@heroui/react";
import { Check, X } from "lucide-react";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export const metadata = {
  title: "Pipes · Pricing",
  description: "Simple, honest pricing for structured system authoring, collaboration, and protocol-ready architecture workflows."
};

// ─── Plan definitions ─────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "/mo",
    tagline: "For individuals exploring structured system design.",
    highlighted: false,
    ctaLabel: "Get started free",
    ctaVariant: "outline" as const,
    ctaHref: "/signup?source=pricing_free",
    ctaEvent: "pricing_cta_clicked",
    ctaMeta: { plan: "free", source: "pricing_cards" },
    features: [
      "Up to 3 systems",
      "Simulation",
      "Community templates",
      "Basic validation",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$12",
    period: "/mo per workspace",
    tagline: "For teams building and shipping real systems together.",
    highlighted: true,
    ctaLabel: "Upgrade to Pro",
    ctaVariant: "primary" as const,
    ctaHref: "/signup?source=pricing_pro",
    ctaEvent: "pricing_cta_clicked",
    ctaMeta: { plan: "pro", source: "pricing_cards" },
    features: [
      "Up to 25 systems",
      "Collaboration + invites",
      "Version history",
      "Advanced validation",
      "API / MCP access",
      "Pro templates",
    ],
  },
  {
    id: "builder",
    name: "Builder",
    price: "$29",
    period: "/mo per workspace",
    tagline: "For power users running agent-native workflows.",
    highlighted: false,
    ctaLabel: "Upgrade to Builder",
    ctaVariant: "ghost" as const,
    ctaHref: "/signup?source=pricing_builder",
    ctaEvent: "pricing_cta_clicked",
    ctaMeta: { plan: "builder", source: "pricing_cards" },
    features: [
      "Up to 250 systems",
      "AI system generation",
      "AI edit suggestions",
      "Sub-agent builder",
      "All Pro features",
    ],
  },
] as const;

// ─── Feature comparison table data ────────────────────────────────────────────

type CellValue = string | boolean;

const COMPARISON_ROWS: { feature: string; free: CellValue; pro: CellValue; builder: CellValue }[] = [
  { feature: "Systems",              free: "3",     pro: "25",    builder: "250"  },
  { feature: "Simulation",           free: true,    pro: true,    builder: true   },
  { feature: "Community templates",  free: true,    pro: true,    builder: true   },
  { feature: "Pro templates",        free: false,   pro: true,    builder: true   },
  { feature: "Basic validation",     free: true,    pro: true,    builder: true   },
  { feature: "Advanced validation",  free: false,   pro: true,    builder: true   },
  { feature: "Collaboration",        free: false,   pro: true,    builder: true   },
  { feature: "Version history",      free: false,   pro: true,    builder: true   },
  { feature: "API / MCP access",     free: false,   pro: true,    builder: true   },
  { feature: "AI system generation", free: false,   pro: false,   builder: true   },
  { feature: "AI edit suggestions",  free: false,   pro: false,   builder: true   },
  { feature: "Sub-agent builder",    free: false,   pro: false,   builder: true   },
];

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const FAQS = [
  {
    id: "faq-free",
    question: "Is the Free plan really free forever?",
    answer:
      "Yes. The Free plan has no time limit. You can model up to 3 systems, run simulations, and use community templates with no credit card required. Upgrade only when you need more.",
  },
  {
    id: "faq-workspace",
    question: "What counts as a workspace?",
    answer:
      "A workspace is a shared environment where you and your team collaborate on systems. Billing is per workspace, so a team of 10 in one Pro workspace pays $12/mo — not $12 per person.",
  },
  {
    id: "faq-upgrade",
    question: "Can I upgrade or downgrade at any time?",
    answer:
      "Yes. You can upgrade at any time and your new limits take effect immediately. If you downgrade, your plan changes at the end of the current billing period. Systems above the new limit become read-only.",
  },
  {
    id: "faq-mcp",
    question: "What is API / MCP access?",
    answer:
      "MCP (Model Context Protocol) access lets external agents and tools read your system contracts via a stable REST/MCP surface. This is how AI tools like Claude can plan and execute against your architecture without re-prompting.",
  },
] as const;

// ─── Cell renderer ────────────────────────────────────────────────────────────

function ComparisonCell({ value }: { value: CellValue }) {
  if (typeof value === "string") {
    return <span className="font-semibold text-slate-800">{value}</span>;
  }
  if (value) {
    return <Check className="w-4 h-4 text-indigo-500 mx-auto" aria-label="Included" />;
  }
  return <X className="w-4 h-4 text-slate-300 mx-auto" aria-label="Not included" />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── 1. HEADER ───────────────────────────────────────────────────── */}
      <section className="pt-20 pb-14 px-6 text-center bg-gradient-to-b from-slate-50 to-white">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
          Simple, honest pricing
        </h1>
        <p className="mt-3 text-lg text-slate-600 max-w-md mx-auto">
          Start free. Upgrade when you need more.
        </p>
      </section>

      {/* ── 2. PRICING CARDS ────────────────────────────────────────────── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={[
                "flex flex-col",
                plan.highlighted
                  ? "border-2 border-indigo-500 relative shadow-lg"
                  : "border border-slate-200 shadow-sm",
              ].join(" ")}
            >
              {/* "Most Popular" badge */}
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Chip
                    size="sm"
                    variant="secondary"
                    className="font-semibold text-xs px-3"
                  >
                    Most Popular
                  </Chip>
                </div>
              )}

              <Card.Header className="px-6 pt-7 pb-0 flex flex-col items-start gap-1">
                <span className="text-xl font-bold text-slate-900">{plan.name}</span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                  <span className="text-sm text-slate-500 font-medium">{plan.period}</span>
                </div>
                <p className="text-sm text-slate-500 mt-2 leading-snug">{plan.tagline}</p>
              </Card.Header>

              <Card.Content className="px-6 py-5 flex-1">
                <Separator className="mb-5" />
                <ul className="flex flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-700">
                      <Check
                        className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500"
                        aria-hidden
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </Card.Content>

              <Card.Footer className="px-6 pb-6 pt-0">
                <TrackedLink
                  href={plan.ctaHref}
                  event={plan.ctaEvent}
                  metadata={plan.ctaMeta}
                  className="w-full"
                >
                  <Button
                    variant={plan.ctaVariant}
                    className={[
                      "w-full font-semibold",
                      plan.id === "builder"
                        ? "bg-slate-900 text-white hover:bg-slate-800"
                        : "",
                    ].join(" ")}
                  >
                    {plan.ctaLabel}
                  </Button>
                </TrackedLink>
              </Card.Footer>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── 3. FEATURE COMPARISON TABLE ─────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Compare plans</h2>
            <p className="mt-2 text-slate-500 text-base">Everything side by side.</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-6 py-4 font-semibold text-slate-700 w-1/2">
                    Feature
                  </th>
                  <th className="text-center px-4 py-4 font-semibold text-slate-700">Free</th>
                  <th className="text-center px-4 py-4 font-bold text-indigo-600">Pro</th>
                  <th className="text-center px-4 py-4 font-semibold text-slate-700">Builder</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr
                    key={row.feature}
                    className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                  >
                    <td className="px-6 py-3.5 text-slate-600">{row.feature}</td>
                    <td className="px-4 py-3.5 text-center">
                      <ComparisonCell value={row.free} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <ComparisonCell value={row.pro} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <ComparisonCell value={row.builder} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Separator />

      {/* ── 4. FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Frequently asked questions</h2>
          </div>

          <Accordion hideSeparator={false} className="flex flex-col divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            {FAQS.map((faq) => (
              <Accordion.Item key={faq.id} id={faq.id} className="bg-white">
                <Accordion.Heading className="m-0">
                  <Accordion.Trigger className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-base font-semibold text-slate-800 hover:bg-slate-50 transition-colors">
                    {faq.question}
                    <Accordion.Indicator className="shrink-0 text-slate-400" />
                  </Accordion.Trigger>
                </Accordion.Heading>
                <Accordion.Panel>
                  <Accordion.Body className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">
                    {faq.answer}
                  </Accordion.Body>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── 5. BOTTOM CTA ───────────────────────────────────────────────── */}
      <section className="px-6 pb-24 pt-2 bg-white">
        <div className="max-w-3xl mx-auto rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 px-8 py-16 text-center shadow-xl">
          <h2 className="text-3xl font-bold text-white">
            Ready to build your first system?
          </h2>
          <p className="mt-3 text-indigo-200 text-base max-w-md mx-auto">
            Free forever. No credit card required. Upgrade when your team grows.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <TrackedLink
              href="/signup?source=pricing_bottom_cta"
              event="pricing_cta_clicked"
              metadata={{ source: "pricing_bottom_cta" }}
            >
              <Button
                size="lg"
                className="rounded-full bg-white text-indigo-700 font-bold px-10 shadow-lg hover:bg-indigo-50"
              >
                Get started free
              </Button>
            </TrackedLink>
            <TrackedLink
              href="/signup?source=pricing_bottom_pro"
              event="pricing_cta_clicked"
              metadata={{ source: "pricing_bottom_pro" }}
            >
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-indigo-300 text-white font-semibold px-8 hover:border-white"
              >
                Upgrade to Pro
              </Button>
            </TrackedLink>
          </div>
        </div>
      </section>

    </div>
  );
}
