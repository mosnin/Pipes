import { Button, Card, Chip, Separator } from "@heroui/react";
import { CheckCircle2, Zap, Users, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export const metadata = {
  title: "Pipes · Systems, not diagrams",
  description:
    "Model reusable, validated, protocol-ready systems for humans and agents.",
};

// ─── Feature grid data ────────────────────────────────────────────────────────

const FEATURES = [
  { emoji: "🎨", label: "Editor",        href: "/editor",        isNew: false },
  { emoji: "🤖", label: "Agent Builder", href: "/agent-builder", isNew: true  },
  { emoji: "📋", label: "Templates",     href: "/templates",     isNew: false },
  { emoji: "🔌", label: "Protocol",      href: "/protocol",      isNew: true  },
  { emoji: "📦", label: "Handoff",       href: "/handoff",       isNew: false },
  { emoji: "⚡", label: "Simulation",    href: "/simulation",    isNew: false },
  { emoji: "👥", label: "Collaboration", href: "/collaboration", isNew: false },
  { emoji: "🛡️", label: "Governance",   href: "/governance",    isNew: false },
  { emoji: "✅", label: "Validation",    href: "/validation",    isNew: false },
] as const;

// ─── Proof points ─────────────────────────────────────────────────────────────

const PROOF_POINTS = [
  {
    icon: <Zap className="w-6 h-6 text-indigo-500" />,
    title: "Not just diagrams",
    body: "Typed nodes, ports, and pipes keep architecture executable, reviewable, and machine-consumable — not just pretty boxes.",
    accent: "from-indigo-50 to-violet-50",
  },
  {
    icon: <span className="text-2xl leading-none" role="img" aria-label="robot">🤖</span>,
    title: "Agent-native",
    body: "Systems are modelled once and exposed through stable MCP/REST surfaces agents can plan against without re-prompting.",
    accent: "from-violet-50 to-purple-50",
  },
  {
    icon: <Users className="w-6 h-6 text-indigo-500" />,
    title: "Team-ready",
    body: "Version, review, and share one system contract across engineers, PMs, and AI tools — no sync meetings required.",
    accent: "from-sky-50 to-indigo-50",
  },
] as const;

// ─── Complexity badge colour map ──────────────────────────────────────────────

function complexityColor(c: string): "success" | "warning" | "danger" {
  if (c === "simple")   return "success";
  if (c === "advanced") return "danger";
  return "warning";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const home      = publicContentService.getHome();
  const templates = publicContentService.listTemplates().slice(0, 4);

  return (
    <div className="min-h-screen bg-white">

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white pt-24 pb-24 px-6 text-center">

        {/* dot-grid backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            opacity: 0.35,
          }}
        />

        {/* radial glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[520px] w-[900px] rounded-full bg-indigo-100 opacity-30 blur-3xl"
        />

        {/* pill badge */}
        <div className="relative inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-1.5 text-sm font-medium text-indigo-700 shadow-sm mb-8">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" aria-hidden />
          Now with Agent Builder &amp; Protocol
        </div>

        {/* headline */}
        <h1 className="relative text-5xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.06] max-w-4xl mx-auto">
          Design systems that
          <br />
          <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
            actually run
          </span>
        </h1>

        {/* sub-headline */}
        <p className="relative mt-5 text-xl md:text-2xl font-medium text-slate-500 max-w-lg mx-auto">
          for{" "}
          <span className="text-slate-800 font-semibold">humans</span>
          {" "}and{" "}
          <span className="text-slate-800 font-semibold">agents</span>
        </p>

        {/* checklist */}
        <ul className="relative mt-10 inline-flex flex-col gap-3.5 text-left text-base md:text-lg text-slate-700">
          {[
            {
              label: "Structure.",
              rest: "AI and humans design together with full context.",
            },
            {
              label: "Validate.",
              rest: "Catch issues before they reach production.",
            },
            {
              label: "Run.",
              rest: "Agent-ready execution with policy controls.",
            },
          ].map(({ label, rest }) => (
            <li key={label} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0 text-indigo-500" aria-hidden />
              <span>
                <strong className="text-slate-900">{label}</strong>{" "}{rest}
              </span>
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
          <TrackedLink
            href={home.hero.primaryCta.href}
            event="homepage_cta_clicked"
            metadata={{ location: "hero_primary" }}
          >
            <Button
              size="lg"
              className="bg-slate-900 text-white font-semibold px-10 shadow-lg hover:bg-slate-800 transition-colors"
            >
              Start building free
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Button>
          </TrackedLink>

          <TrackedLink
            href={home.hero.secondaryCta.href}
            event="homepage_cta_clicked"
            metadata={{ location: "hero_secondary" }}
          >
            <Button
              size="lg"
              variant="outline"
              className="font-semibold px-8 border-slate-300 text-slate-700 hover:border-slate-500 transition-colors"
            >
              See how it works
            </Button>
          </TrackedLink>
        </div>

        {/* trust note */}
        <p className="relative mt-4 text-sm text-slate-400">
          Free forever · No credit card required
        </p>
      </section>

      <Separator />

      {/* ── 2. FEATURE GRID ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Everything your system needs
            </h2>
            <p className="mt-3 text-slate-500 text-lg max-w-xl mx-auto">
              One workspace. Design, validate, simulate, and ship.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {FEATURES.map(({ emoji, label, href, isNew }) => (
              <TrackedLink
                key={label}
                href={href}
                event="feature_tile_clicked"
                metadata={{ feature: label.toLowerCase().replace(/\s+/g, "_") }}
                className="group"
              >
                <Card
                  className="border border-slate-100 hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer bg-white hover:bg-indigo-50/40"
                >
                  <Card.Content className="flex flex-row items-center gap-3 py-4 px-4 sm:px-5">
                    <span
                      className="text-2xl leading-none flex-shrink-0"
                      role="img"
                      aria-label={label}
                    >
                      {emoji}
                    </span>
                    <span className="font-semibold text-slate-800 text-sm md:text-base group-hover:text-indigo-700 transition-colors truncate">
                      {label}
                    </span>
                    {isNew && (
                      <Chip
                        size="sm"
                        color="accent"
                        variant="soft"
                        className="ml-auto flex-shrink-0 text-xs font-bold"
                      >
                        New
                      </Chip>
                    )}
                  </Card.Content>
                </Card>
              </TrackedLink>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* ── 3. WHY PIPES ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
              Why teams choose Pipes
            </h2>
            <p className="mt-3 text-slate-500 text-lg max-w-xl mx-auto">
              Built for operational system memory, not visual sketches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PROOF_POINTS.map(({ icon, title, body, accent }) => (
              <Card
                key={title}
                className={`border border-slate-200 bg-gradient-to-br ${accent}`}
              >
                <Card.Content className="p-7 flex flex-col gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100">
                    {icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg mb-1.5">
                      {title}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      {body}
                    </p>
                  </div>
                </Card.Content>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* ── 4. TEMPLATES PREVIEW ─────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                Start from a template
              </h2>
              <p className="mt-2 text-slate-500 text-lg">
                Proven patterns, ready to customise.
              </p>
            </div>
            <TrackedLink
              href="/templates"
              event="templates_browse_clicked"
              metadata={{ source: "home_templates_section" }}
              className="self-start sm:self-auto"
            >
              <Button
                variant="ghost"
                className="text-indigo-600 font-semibold hover:text-indigo-800"
              >
                Browse all
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Button>
            </TrackedLink>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {templates.map((t) => (
              <TrackedLink
                key={t.id}
                href={`/templates/${t.slug}`}
                event="template_detail_viewed"
                metadata={{ source: "home", template_id: t.id }}
                className="group"
              >
                <Card
                  className="h-full border border-slate-100 hover:border-indigo-300 hover:shadow-md transition-all duration-200 bg-white cursor-pointer"
                >
                  <Card.Content className="p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-indigo-700 transition-colors">
                        {t.title}
                      </h3>
                      <Chip
                        size="sm"
                        variant="soft"
                        color={complexityColor(t.complexity)}
                        className="shrink-0 capitalize text-xs"
                      >
                        {t.complexity}
                      </Chip>
                    </div>
                    <p className="text-slate-500 text-xs leading-relaxed flex-1">
                      {t.description}
                    </p>
                    <p className="text-xs text-slate-400 font-mono pt-1 border-t border-slate-100">
                      {t.preview}
                    </p>
                  </Card.Content>
                </Card>
              </TrackedLink>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="px-6 pb-24 pt-4 bg-white">
        <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 px-8 py-16 text-center shadow-2xl relative overflow-hidden">

          {/* subtle inner highlight */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-white opacity-5 blur-3xl"
          />

          <ShieldCheck
            className="relative mx-auto mb-5 w-10 h-10 text-indigo-200"
            aria-hidden
          />

          <h2 className="relative text-3xl md:text-5xl font-bold text-white leading-tight">
            Ready to design your first system?
          </h2>
          <p className="relative mt-4 text-indigo-200 text-lg max-w-xl mx-auto">
            Join teams who run their architecture — not just draw it.
          </p>

          <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
            <TrackedLink
              href={home.finalCta.href}
              event="homepage_cta_clicked"
              metadata={{ location: "final_cta" }}
            >
              <Button
                size="lg"
                className="bg-white text-indigo-700 font-bold px-10 shadow-lg hover:bg-indigo-50 transition-colors"
              >
                Create free workspace
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Button>
            </TrackedLink>

            <TrackedLink
              href="/templates"
              event="homepage_cta_clicked"
              metadata={{ location: "final_cta_secondary" }}
            >
              <Button
                size="lg"
                variant="outline"
                className="border-indigo-300 text-white font-semibold px-8 hover:border-white transition-colors"
              >
                Explore templates
              </Button>
            </TrackedLink>
          </div>

          <p className="relative mt-5 text-indigo-300 text-sm">
            Free forever · No credit card required
          </p>
        </div>
      </section>

    </div>
  );
}
