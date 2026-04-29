import { Button, Card, Chip, Separator } from "@heroui/react";
import { CheckCircle2, Zap, Users, ArrowRight, Sparkles } from "lucide-react";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export const metadata = {
  title: "Pipes · Systems, not diagrams",
  description: "Model reusable, validated, protocol-ready systems for humans and agents.",
};

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

const PROOF_POINTS = [
  {
    icon: <Zap className="w-5 h-5 text-indigo-600" />,
    title: "Not just diagrams",
    body: "Typed nodes, ports, and pipes keep architecture executable, reviewable, and machine-consumable — not just pretty boxes.",
  },
  {
    icon: <span className="text-xl leading-none" role="img" aria-label="robot">🤖</span>,
    title: "Agent-native",
    body: "Systems are modelled once and exposed through stable MCP/REST surfaces agents can plan against without re-prompting.",
  },
  {
    icon: <Users className="w-5 h-5 text-indigo-600" />,
    title: "Team-ready",
    body: "Version, review, and share one system contract across engineers, PMs, and AI tools — no sync meetings required.",
  },
] as const;

function complexityColor(c: string): "success" | "warning" | "danger" {
  if (c === "simple")   return "success";
  if (c === "advanced") return "danger";
  return "warning";
}

export default async function HomePage() {
  const home      = publicContentService.getHome();
  const templates = publicContentService.listTemplates().slice(0, 4);

  return (
    <div className="min-h-screen bg-white">

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-white pt-28 pb-28 px-6 text-center">

        {/* Subtle dot grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            opacity: 0.4,
          }}
        />

        {/* Single soft glow — one, not three */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-80px] -translate-x-1/2 h-[480px] w-[800px] rounded-full bg-indigo-100 opacity-25 blur-3xl"
        />

        {/* Pill badge */}
        <div className="relative inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-1.5 mb-8"
             style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}>
          <Sparkles className="w-3 h-3 text-indigo-500" aria-hidden />
          <span className="t-label font-medium text-indigo-700">Now with Agent Builder &amp; Protocol</span>
        </div>

        {/* Headline — tight tracking, flat indigo, no gradient soup */}
        <h1 className="relative text-5xl md:text-[72px] font-bold text-[#111] max-w-3xl mx-auto leading-[1.04]"
            style={{ letterSpacing: "-0.04em" }}>
          Design systems that<br />
          <span className="text-indigo-600">actually run</span>
        </h1>

        {/* Sub-headline */}
        <p className="relative mt-5 text-xl text-[#3C3C43] max-w-md mx-auto font-normal">
          For humans and agents, together.
        </p>

        {/* Checklist */}
        <ul className="relative mt-10 inline-flex flex-col gap-3 text-left">
          {[
            { label: "Structure.", rest: "AI and humans design together with full context." },
            { label: "Validate.", rest: "Catch issues before they reach production." },
            { label: "Run.", rest: "Agent-ready execution with policy controls." },
          ].map(({ label, rest }) => (
            <li key={label} className="flex items-start gap-3 t-body">
              <CheckCircle2 className="w-[18px] h-[18px] mt-0.5 flex-shrink-0 text-indigo-500" aria-hidden />
              <span className="text-[#3C3C43]">
                <strong className="text-[#111] font-semibold">{label}</strong>{" "}{rest}
              </span>
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3">
          <TrackedLink
            href={home.hero.primaryCta.href}
            event="homepage_cta_clicked"
            metadata={{ location: "hero_primary" }}
          >
            <Button
              size="lg"
              className="bg-[#111] text-white font-semibold px-9 hover:bg-[#222] transition-colors"
              style={{ borderRadius: "10px", height: "46px" }}
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
              className="font-medium px-8 border-[#d1d5db] text-[#3C3C43] hover:border-[#9ca3af] transition-colors"
              style={{ borderRadius: "10px", height: "46px" }}
            >
              See how it works
            </Button>
          </TrackedLink>
        </div>

        <p className="relative mt-4 t-label text-[#8E8E93]">
          Free forever · No credit card required
        </p>
      </section>

      <Separator />

      {/* ── 2. FEATURE GRID ──────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#111]">
              Everything your system needs
            </h2>
            <p className="mt-3 text-[#3C3C43] text-lg max-w-xl mx-auto">
              One workspace. Design, validate, simulate, and ship.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {FEATURES.map(({ emoji, label, href, isNew }) => (
              <TrackedLink
                key={label}
                href={href}
                event="feature_tile_clicked"
                metadata={{ feature: label.toLowerCase().replace(/\s+/g, "_") }}
                className="group"
              >
                <Card className="border border-black/[0.08] hover:border-indigo-300 transition-colors duration-150 cursor-pointer bg-white"
                      style={{ borderRadius: "12px" }}>
                  <Card.Content className="flex flex-row items-center gap-3 py-4 px-4">
                    <span className="text-xl leading-none flex-shrink-0" role="img" aria-label={label}>
                      {emoji}
                    </span>
                    <span className="t-label font-semibold text-[#111] group-hover:text-indigo-600 transition-colors truncate">
                      {label}
                    </span>
                    {isNew && (
                      <Chip size="sm" color="accent" variant="soft"
                            className="ml-auto flex-shrink-0 text-[10px] font-bold">
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
      <section className="py-20 px-6 bg-[#F5F5F7]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#111]">
              Why teams choose Pipes
            </h2>
            <p className="mt-3 text-[#3C3C43] text-lg max-w-xl mx-auto">
              Built for operational system memory, not visual sketches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PROOF_POINTS.map(({ icon, title, body }) => (
              <Card key={title} className="bg-white border border-black/[0.08]"
                    style={{ borderRadius: "16px" }}>
                <Card.Content className="p-7 flex flex-col gap-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                    {icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#111] text-[17px] mb-2" style={{ letterSpacing: "-0.02em" }}>
                      {title}
                    </h3>
                    <p className="t-label text-[#3C3C43] leading-relaxed">{body}</p>
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
              <h2 className="text-3xl md:text-4xl font-bold text-[#111]">
                Start from a template
              </h2>
              <p className="mt-2 text-[#3C3C43] text-lg">Proven patterns, ready to customise.</p>
            </div>
            <TrackedLink href="/templates" event="templates_browse_clicked"
                         metadata={{ source: "home_templates_section" }}
                         className="self-start sm:self-auto">
              <Button variant="ghost" className="text-indigo-600 font-semibold hover:text-indigo-700">
                Browse all <ArrowRight className="w-4 h-4" aria-hidden />
              </Button>
            </TrackedLink>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map((t) => (
              <TrackedLink
                key={t.id}
                href={`/templates/${t.slug}`}
                event="template_detail_viewed"
                metadata={{ source: "home", template_id: t.id }}
                className="group"
              >
                <Card className="h-full border border-black/[0.08] hover:border-indigo-300 transition-colors duration-150 bg-white cursor-pointer"
                      style={{ borderRadius: "12px" }}>
                  <Card.Content className="p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-[#111] t-label leading-snug group-hover:text-indigo-600 transition-colors">
                        {t.title}
                      </h3>
                      <Chip size="sm" variant="soft" color={complexityColor(t.complexity)}
                            className="shrink-0 capitalize text-[10px]">
                        {t.complexity}
                      </Chip>
                    </div>
                    <p className="t-caption text-[#3C3C43] leading-relaxed flex-1">{t.description}</p>
                    <p className="t-caption text-[#8E8E93] font-mono pt-1 border-t border-black/[0.06]">
                      {t.preview}
                    </p>
                  </Card.Content>
                </Card>
              </TrackedLink>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. FINAL CTA — flat indigo, no gradient chaos ────────────────────── */}
      <section className="px-6 pb-24 pt-4 bg-white">
        <div className="max-w-4xl mx-auto bg-indigo-600 px-8 py-16 text-center relative overflow-hidden"
             style={{ borderRadius: "24px" }}>

          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[260px] rounded-full bg-white opacity-[0.06] blur-3xl"
          />

          <h2 className="relative text-3xl md:text-5xl font-bold text-white"
              style={{ letterSpacing: "-0.03em" }}>
            Ready to design your first system?
          </h2>
          <p className="relative mt-4 text-indigo-200 text-lg max-w-xl mx-auto">
            Join teams who run their architecture — not just draw it.
          </p>

          <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3">
            <TrackedLink href={home.finalCta.href} event="homepage_cta_clicked"
                         metadata={{ location: "final_cta" }}>
              <Button size="lg"
                      className="bg-white text-indigo-700 font-bold px-10 hover:bg-indigo-50 transition-colors"
                      style={{ borderRadius: "10px", height: "46px" }}>
                Create free workspace
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Button>
            </TrackedLink>

            <TrackedLink href="/templates" event="homepage_cta_clicked"
                         metadata={{ location: "final_cta_secondary" }}>
              <Button size="lg" variant="outline"
                      className="border-indigo-400 text-white font-medium px-8 hover:border-white transition-colors"
                      style={{ borderRadius: "10px", height: "46px" }}>
                Explore templates
              </Button>
            </TrackedLink>
          </div>

          <p className="relative mt-5 text-indigo-300 t-label">
            Free forever · No credit card required
          </p>
        </div>
      </section>

    </div>
  );
}
