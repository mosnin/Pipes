import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { publicContentService } from "@/domain/services/public";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { SectionBadge } from "@/components/marketing/SectionBadge";

export const metadata = {
  title: "Pipes - One map your team and your agents both read",
  description:
    "Draw the system once. Your team reviews it. Your agents read it through one token.",
};

const TRUST_LOGOS = [
  "Acme Corp",
  "Northwind",
  "Vercel",
  "Linear",
  "Stripe",
  "Anthropic",
] as const;

const MAGIC_BEATS = [
  {
    n: "01",
    title: "Open an empty canvas",
    body: "You see one line: One map your team and your agents both read.",
  },
  {
    n: "02",
    title: "Press slash, pick Agent",
    body: "A node lands on the canvas with a blinking title.",
  },
  {
    n: "03",
    title: "Type one sentence",
    body: "Planner agent. Reads tickets, writes a plan, hands off to the coder.",
  },
  {
    n: "04",
    title: "Click Connect Agent",
    body: "A panel slides in with a Bearer token and a Claude Desktop config block.",
  },
  {
    n: "05",
    title: "Paste once into Claude",
    body: "Copy the block. Paste it into your Claude config. Reopen Claude.",
  },
  {
    n: "06",
    title: "Ask Claude what is in your system",
    body: "Claude answers by name. The Planner agent. Your sentence. You pasted no architecture.",
  },
] as const;

const FEATURE_BLOCKS = [
  {
    eyebrow: "Canvas",
    title: "An IDE for system design",
    body: "Typed nodes. Typed ports. Typed pipes. Pipes is a canvas built for engineers who think in contracts, not boxes and arrows.",
    bullets: [
      "27 node types covering services, agents, jobs, queues, and humans",
      "Schema-aware ports prevent invalid connections",
      "Inline validation catches drift as you draw",
    ],
    cta: { label: "Browse templates", href: "/templates" },
    visual: { label: "system_canvas.tsx", caption: "Live canvas with typed ports" },
    reverse: false,
  },
  {
    eyebrow: "Protocol",
    title: "Stable surfaces for every agent",
    body: "Hand any agent a token and it sees the system the way your team does. MCP and REST share a single bounded service layer.",
    bullets: [
      "11 scoped capabilities, per-token",
      "Idempotency keys on every write",
      "Audit log for every MCP call",
    ],
    cta: { label: "Read the protocol", href: "/protocol" },
    visual: { label: "POST /api/protocol/mcp", caption: "Bearer ptk_..." },
    reverse: true,
  },
] as const;

function ScreenshotPlaceholder({
  label,
  caption,
}: {
  label: string;
  caption: string;
}) {
  return (
    <div
      className="surface-muted relative aspect-[5/4] w-full overflow-hidden rounded-[12px] border border-dashed border-black/[0.14]"
      role="img"
      aria-label={`Screenshot placeholder: ${label}`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md border border-black/[0.08] bg-white px-2 py-1">
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full bg-[#FCA5A5]"
        />
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full bg-[#FCD34D]"
        />
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full bg-[#86EFAC]"
        />
        <span className="ml-1.5 t-mono text-[#3C3C43]" style={{ fontSize: 11 }}>
          {label}
        </span>
      </div>
      <div className="absolute bottom-4 left-4 right-4 t-caption text-[#8E8E93]">
        {caption}
      </div>
    </div>
  );
}

function complexityTone(c: string): "good" | "warn" | "neutral" {
  if (c === "simple") return "good";
  if (c === "advanced") return "warn";
  return "neutral";
}

export default async function HomePage() {
  const home = publicContentService.getHome();
  const templates = publicContentService.listTemplates().slice(0, 4);

  return (
    <div className="min-h-screen bg-white">

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-black/[0.06] pt-20 pb-20 sm:pt-24 sm:pb-24">
        {/* Subtle grid */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.45]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage:
              "radial-gradient(ellipse 70% 50% at 50% 0%, #000 50%, transparent 100%)",
          }}
        />
        {/* One soft glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[-120px] h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-indigo-100/60 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-6 text-center">
          <SectionBadge
            icon={<Zap size={11} aria-hidden="true" />}
            label="Now with MCP capability scoping"
          />

          <h1
            className="mt-6 text-[40px] sm:text-[56px] lg:text-[64px] font-bold text-[#111] mx-auto max-w-4xl"
            style={{ letterSpacing: "-0.04em", lineHeight: 1.05 }}
          >
            One map your team and your agents both read.
          </h1>

          <p className="mt-6 mx-auto max-w-2xl t-body text-[#3C3C43]">
            Draw the nodes, ports, and pipes once. Stop being the map.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <TrackedLink
              href={home.hero.primaryCta.href}
              event="homepage_cta_clicked"
              metadata={{ location: "hero_primary" }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[#111] px-5 h-11 t-label font-semibold text-white hover:bg-indigo-700 transition-colors">
                Start building free
                <ArrowRight size={14} aria-hidden="true" />
              </span>
            </TrackedLink>

            <TrackedLink
              href="/protocol"
              event="homepage_cta_clicked"
              metadata={{ location: "hero_secondary" }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-md border border-black/[0.14] bg-white px-5 h-11 t-label font-semibold text-[#111] hover:border-black/[0.24] hover:bg-black/[0.02] transition-colors">
                Read the protocol
              </span>
            </TrackedLink>
          </div>

          <p className="mt-4 t-caption text-[#8E8E93]">
            Free workspace - no credit card required - SOC 2 Type II
          </p>
        </div>
      </section>

      {/* ── 2. TRUST BAR ────────────────────────────────────────────────────── */}
      <section className="border-b border-black/[0.06] bg-white py-10">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center t-overline text-[#8E8E93] mb-6">
            Trusted by teams shipping production AI systems
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {TRUST_LOGOS.map((logo) => (
              <span
                key={logo}
                className="t-label font-semibold text-[#8E8E93] hover:text-[#3C3C43] transition-colors"
                style={{ letterSpacing: "-0.01em" }}
              >
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. SEE IT IN ACTION ─────────────────────────────────────────────── */}
      <section className="border-b border-black/[0.06] bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl">
            <SectionBadge label="See it in action" />
            <h2
              className="mt-4 t-h1 text-[#111]"
              style={{ letterSpacing: "-0.025em" }}
            >
              It already knows my system.
            </h2>
            <p className="mt-3 t-body text-[#3C3C43]">
              Thirty seconds from empty canvas to an agent reading your system by name. No pasted architecture.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-[12px] border border-black/[0.08] bg-black/[0.06] md:grid-cols-3">
            {MAGIC_BEATS.map(({ n, title, body }) => (
              <div key={n} className="flex flex-col gap-4 bg-white p-7">
                <span
                  className="t-mono text-[#C7C7CC]"
                  style={{ fontSize: 28, letterSpacing: "-0.02em" }}
                >
                  {n}
                </span>
                <h3 className="t-title text-[#111]">{title}</h3>
                <p className="t-label text-[#3C3C43] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. FEATURE DEEP-DIVE BLOCKS ─────────────────────────────────────── */}
      <section className="surface-subtle border-b border-black/[0.06] py-24">
        <div className="mx-auto max-w-6xl px-6 flex flex-col gap-24">
          {FEATURE_BLOCKS.map((block, idx) => (
            <div
              key={block.title}
              className={[
                "grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center",
                block.reverse ? "lg:[&>*:first-child]:order-2" : "",
              ].join(" ")}
            >
              <div className="flex flex-col gap-5">
                <SectionBadge
                  label={block.eyebrow}
                  icon={<span className="t-mono">{String(idx + 1).padStart(2, "0")}</span>}
                />
                <h3
                  className="t-h2 text-[#111]"
                  style={{ fontSize: 32, letterSpacing: "-0.025em" }}
                >
                  {block.title}
                </h3>
                <p className="t-body text-[#3C3C43]">{block.body}</p>
                <ul className="flex flex-col gap-2.5 pt-2">
                  {block.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 t-label text-[#3C3C43]">
                      <CheckCircle2
                        size={16}
                        className="mt-0.5 shrink-0 text-indigo-600"
                        aria-hidden="true"
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-2">
                  <Link
                    href={block.cta.href}
                    className="inline-flex items-center gap-1 t-label font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    {block.cta.label}
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>
              <ScreenshotPlaceholder
                label={block.visual.label}
                caption={block.visual.caption}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. TEMPLATES PREVIEW ────────────────────────────────────────────── */}
      <section className="border-b border-black/[0.06] bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div className="max-w-xl">
              <SectionBadge label="Templates" />
              <h2
                className="mt-4 t-h1 text-[#111]"
                style={{ letterSpacing: "-0.025em" }}
              >
                Start from a proven blueprint.
              </h2>
              <p className="mt-3 t-body text-[#3C3C43]">
                Battle-tested system shapes you can fork in seconds.
              </p>
            </div>
            <TrackedLink
              href="/templates"
              event="templates_browse_clicked"
              metadata={{ source: "home_templates_section" }}
              className="self-start sm:self-auto"
            >
              <span className="inline-flex items-center gap-1 t-label font-semibold text-indigo-600 hover:text-indigo-700">
                Browse all
                <ArrowRight size={14} aria-hidden="true" />
              </span>
            </TrackedLink>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map((t) => {
              const tone = complexityTone(t.complexity);
              const toneClass =
                tone === "good"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : tone === "warn"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-black/[0.08] bg-[#F5F5F7] text-[#3C3C43]";

              return (
                <TrackedLink
                  key={t.id}
                  href={`/templates/${t.slug}`}
                  event="template_detail_viewed"
                  metadata={{ source: "home", template_id: t.id }}
                  className="group block h-full"
                >
                  <div className="flex h-full flex-col gap-3 rounded-[12px] border border-black/[0.08] bg-white p-5 transition-colors duration-150 hover:border-black/[0.18]">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="t-label font-semibold text-[#111] leading-snug group-hover:text-indigo-700 transition-colors">
                        {t.title}
                      </h3>
                      <span
                        className={[
                          "shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 t-micro font-semibold uppercase tracking-[0.05em] capitalize",
                          toneClass,
                        ].join(" ")}
                      >
                        {t.complexity}
                      </span>
                    </div>
                    <p className="t-caption text-[#3C3C43] leading-relaxed flex-1">
                      {t.description}
                    </p>
                    <p className="t-caption text-[#8E8E93] t-mono pt-2 border-t border-black/[0.06]">
                      {t.preview}
                    </p>
                  </div>
                </TrackedLink>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 6. CUSTOMER PROOF ───────────────────────────────────────────────── */}
      <section className="border-b border-black/[0.06] bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-[16px] border border-black/[0.08] bg-white px-8 py-12">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:items-center">
              <div className="lg:col-span-2">
                <SectionBadge label="From the field" />
                <blockquote
                  className="mt-5 t-h2 text-[#111]"
                  style={{ letterSpacing: "-0.02em", fontSize: 26, lineHeight: 1.3 }}
                >
                  &quot;Pipes is the first tool where our architecture diagrams
                  stop drifting from reality. Our agents read the same system our
                  engineers do.&quot;
                </blockquote>
                <div className="mt-5 flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#111] text-white t-label font-semibold">
                    JD
                  </span>
                  <div>
                    <div className="t-label font-semibold text-[#111]">Jamie Diaz</div>
                    <div className="t-caption text-[#8E8E93]">
                      Staff Engineer, Northwind
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <span
                    className="t-num text-[#111]"
                    style={{ fontSize: 28, letterSpacing: "-0.02em", fontWeight: 700 }}
                  >
                    87%
                  </span>
                  <span className="t-caption text-[#8E8E93]">
                    less re-prompting
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span
                    className="t-num text-[#111]"
                    style={{ fontSize: 28, letterSpacing: "-0.02em", fontWeight: 700 }}
                  >
                    3.2x
                  </span>
                  <span className="t-caption text-[#8E8E93]">
                    faster handoff
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span
                    className="t-num text-[#111]"
                    style={{ fontSize: 28, letterSpacing: "-0.02em", fontWeight: 700 }}
                  >
                    11
                  </span>
                  <span className="t-caption text-[#8E8E93]">
                    MCP capabilities
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. FINAL CTA — flat surface-inverse ─────────────────────────────── */}
      <section className="surface-inverse">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <SectionBadge tone="neutral" label="Get started" />
          <h2
            className="mt-6 mx-auto max-w-3xl text-white"
            style={{
              fontSize: 48,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              fontWeight: 700,
            }}
          >
            Make your architecture executable.
          </h2>
          <p className="mt-5 mx-auto max-w-xl t-body text-[#C7C7CC]">
            A free workspace and your first system are two clicks away. Bring your
            team. Bring your agents.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <TrackedLink
              href={home.finalCta.href}
              event="homepage_cta_clicked"
              metadata={{ location: "final_cta" }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-5 h-11 t-label font-semibold text-[#111] hover:bg-[#F5F5F7] transition-colors">
                Create free workspace
                <ArrowRight size={14} aria-hidden="true" />
              </span>
            </TrackedLink>
            <TrackedLink
              href="/templates"
              event="homepage_cta_clicked"
              metadata={{ location: "final_cta_secondary" }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-transparent px-5 h-11 t-label font-semibold text-white hover:border-white/40 hover:bg-white/[0.04] transition-colors">
                Explore templates
              </span>
            </TrackedLink>
          </div>

          <p className="mt-5 t-caption text-[#8E8E93]">
            Free forever - SOC 2 Type II - SSO available on Enterprise
          </p>
        </div>
      </section>

    </div>
  );
}
