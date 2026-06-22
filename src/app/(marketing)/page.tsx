import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { publicContentService } from "@/domain/services/public";
import { starterTemplates } from "@/domain/templates/catalog";
import { nodeTypeValues } from "@/domain/looper_schema_v1/schema";
import { useCases } from "@/lib/public/content";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { HeroScrollDemo } from "@/components/marketing/HeroScrollDemo";
import {
  ScrollSection,
  RevealStack,
  RevealItem,
} from "@/components/marketing/ScrollSection";
import { MetricsStrip } from "@/components/marketing/MetricsStrip";
import { AGENT_CAPABILITIES } from "@/lib/protocol/tokens";
import { MCP_TOOL_COUNT } from "@/lib/protocol/mcp-tools";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { CompareStrip } from "@/components/marketing/CompareStrip";
import { StarterShowcase, QuoteRotator } from "@/components/marketing/StarterShowcase";
import {
  HeroAnimatedHeadline,
  HeroAnimatedSubtitle,
  HeroAnimatedCtas,
  HeroAnimatedSide,
} from "@/components/marketing/HeroAnimatedHeadline";

const HOMEPAGE_TITLE = "Build agent loops, visually.";
const HOMEPAGE_SUBTITLE =
  "Describe a loop. Watch it appear on the canvas. Refine it with your agent. Share or sell it.";
const OG_IMAGE_URL = `/api/og?title=${encodeURIComponent(HOMEPAGE_TITLE)}&subtitle=${encodeURIComponent(HOMEPAGE_SUBTITLE)}`;

export const metadata = {
  title: HOMEPAGE_TITLE + " - Looper",
  description: HOMEPAGE_SUBTITLE,
  openGraph: {
    title: HOMEPAGE_TITLE,
    description: HOMEPAGE_SUBTITLE,
    type: "website" as const,
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: HOMEPAGE_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image" as const,
    title: HOMEPAGE_TITLE,
    description: HOMEPAGE_SUBTITLE,
    images: [OG_IMAGE_URL],
  },
};

export default function HomePage() {
  const home = publicContentService.getHome();

  // Pick three real catalog starters that map to distinct categories.
  const showcaseStarters = pickShowcaseStarters();

  // Build use-case examples. These are illustrative examples, not customer testimonials.
  const quotes = useCases.slice(0, 3).map((uc) => ({
    title: uc.title,
    body: uc.fit,
    attribution: `Example use case · ${uc.title}`,
  }));

  return (
    <div className="min-h-screen bg-white">
      {/* ───────────────────────────────────────────────────────────────────
          HERO — locked headline + subhead + CTAs, with the scroll-driven
          demo right below. The hero block itself is sized to a full viewport
          on initial paint; the demo lives in its own 300vh wrapper so the
          sticky inner can read scroll progress through it.
         ─────────────────────────────────────────────────────────────────── */}
      <section
        aria-label="Looper hero"
        className="relative flex min-h-[92vh] items-center overflow-hidden"
      >
        {/* Floating gradient orbs — atmospheric depth */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="looper-orb-1 absolute rounded-full"
            style={{
              width: 680,
              height: 680,
              top: "-180px",
              left: "-120px",
              background: "radial-gradient(circle, rgba(99,102,241,0.13) 0%, rgba(139,92,246,0.07) 45%, transparent 70%)",
              filter: "blur(48px)",
            }}
          />
          <div
            className="looper-orb-2 absolute rounded-full"
            style={{
              width: 500,
              height: 500,
              top: "60px",
              right: "-100px",
              background: "radial-gradient(circle, rgba(79,70,229,0.10) 0%, rgba(99,102,241,0.05) 50%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />
        </div>
        <div className="relative mx-auto w-full max-w-7xl px-6 pt-24 pb-12">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 t-caption font-semibold uppercase tracking-[0.08em] text-indigo-700"
                style={{ fontSize: 11 }}
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500"
                />
                Co-author loops with your agent
              </span>
              <HeroAnimatedHeadline />
              <HeroAnimatedSubtitle>
                {HOMEPAGE_SUBTITLE}
              </HeroAnimatedSubtitle>
              <HeroAnimatedCtas>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <TrackedLink
                    href={home.hero.primaryCta.href}
                    event="homepage_cta_clicked"
                    metadata={{ location: "hero_primary" }}
                  >
                    <span className="inline-flex h-12 items-center gap-1.5 rounded-full bg-indigo-600 px-6 t-label font-semibold text-white transition-all hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]">
                      Start free
                      <ArrowRight size={14} aria-hidden="true" />
                    </span>
                  </TrackedLink>
                  <Link
                    href="#scroll-demo"
                    className="inline-flex h-12 items-center gap-1.5 rounded-full border border-black/10 bg-white px-6 t-label font-semibold text-[#111] transition-all hover:border-black/30 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Watch the demo
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                </div>
                <div className="mt-6">
                  <Link
                    href="/play"
                    className="t-caption text-[#8E8E93] underline-offset-4 hover:text-[#3C3C43] hover:underline"
                    style={{ fontSize: 12 }}
                  >
                    Or try the live playground at /play
                  </Link>
                </div>
              </HeroAnimatedCtas>
            </div>
            <div className="hidden lg:col-span-5 lg:block">
              <HeroAnimatedSide>
                <HeroSidePreview />
              </HeroAnimatedSide>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────────
          HERO SCROLL DEMO — 300vh outer, sticky inner that plays six beats
          tied to scroll progress. This is the star of the page.
         ─────────────────────────────────────────────────────────────────── */}
      <HeroScrollDemo id="scroll-demo" />

      {/* ───────────────────────────────────────────────────────────────────
          METRICS — counters that count up from 0 the first time they enter
          the viewport. Real-feeling numbers, no logo wall.
         ─────────────────────────────────────────────────────────────────── */}
      <MetricsStrip
        metrics={[
          {
            value: starterTemplates.length,
            label: "starter templates in the catalog",
            suffix: "",
          },
          { value: nodeTypeValues.length, label: "node types to wire any loop" },
          { value: AGENT_CAPABILITIES.length, label: "MCP capability scopes" },
          { value: MCP_TOOL_COUNT, label: "MCP tools for any agent" },
        ]}
      />

      {/* ───────────────────────────────────────────────────────────────────
          SECTION 1 — Stop drawing. Start describing. + CompareStrip
          rounded-[40px]
         ─────────────────────────────────────────────────────────────────── */}
      <ScrollSection tone="subtle" radius={40} ariaLabel="Stop drawing, start describing">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <RevealStack className="flex flex-col gap-5 lg:col-span-5">
            <RevealItem
              as="span"
              className="t-overline text-indigo-700"
            >
              Your agent builds with you.
            </RevealItem>
            <RevealItem
              as="h2"
              className="text-[#111]"
            >
              <span
                style={{
                  fontSize: 44,
                  lineHeight: 1.08,
                  letterSpacing: "-0.03em",
                  fontWeight: 700,
                }}
              >
                Describe the loop. Watch it appear. Refine it together.
              </span>
            </RevealItem>
            <RevealItem as="p" className="t-body text-[#3C3C43]">
              <span style={{ fontSize: 17, lineHeight: 1.55 }}>
                Type one sentence. Your agent draws the loop on the canvas. Drag a step and it adapts. The same loop your team reviews is the one your agents read.
              </span>
            </RevealItem>
            <RevealItem as="div">
              <TrackedLink
                href="/templates"
                event="homepage_cta_clicked"
                metadata={{ location: "describe_section" }}
              >
                <span className="inline-flex items-center gap-1 t-label font-semibold text-indigo-700 hover:text-indigo-800">
                  Browse loop templates
                  <ArrowRight size={14} aria-hidden="true" />
                </span>
              </TrackedLink>
            </RevealItem>
          </RevealStack>
          <div className="lg:col-span-7">
            <CompareStrip />
          </div>
        </div>
      </ScrollSection>

      {/* ───────────────────────────────────────────────────────────────────
          SECTION 2 — Feature grid (2x3). Each tile has a hand-coded SVG.
         ─────────────────────────────────────────────────────────────────── */}
      <FeatureGrid />

      {/* ───────────────────────────────────────────────────────────────────
          SECTION 3 — Every system is a starter. Auto-rotating showcase.
          rounded-[40px], indigo-50.
         ─────────────────────────────────────────────────────────────────── */}
      <ScrollSection tone="indigo" radius={40} ariaLabel="Every loop is a starter">
        <div className="mb-10 flex flex-col gap-3">
          <RevealStack className="flex flex-col gap-3">
            <RevealItem as="span" className="t-overline text-indigo-700">
              Every loop is a starter
            </RevealItem>
            <RevealItem as="h2" className="text-[#111]">
              <span
                style={{
                  fontSize: 44,
                  lineHeight: 1.08,
                  letterSpacing: "-0.03em",
                  fontWeight: 700,
                }}
              >
                Start from a loop pattern we already know how to draw.
              </span>
            </RevealItem>
          </RevealStack>
        </div>
        <StarterShowcase starters={showcaseStarters} />
      </ScrollSection>

      {/* ───────────────────────────────────────────────────────────────────
          SECTION 4 — The whole agent in your pocket. Dark inverse surface.
          rounded-[40px]
         ─────────────────────────────────────────────────────────────────── */}
      <ScrollSection tone="inverse" radius={40} ariaLabel="The whole agent in your pocket">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <RevealStack className="flex flex-col gap-5">
            <RevealItem as="span" className="t-overline text-indigo-300">
              One loop, any agent
            </RevealItem>
            <RevealItem as="h2">
              <span
                className="text-white"
                style={{
                  fontSize: 44,
                  lineHeight: 1.08,
                  letterSpacing: "-0.03em",
                  fontWeight: 700,
                }}
              >
                Claude, LangGraph, AutoGen, CrewAI. One token. One loop.
              </span>
            </RevealItem>
            <RevealItem as="p">
              <span
                className="text-[#C7C7CC]"
                style={{ fontSize: 17, lineHeight: 1.55 }}
              >
                Export one MCP token. Paste it into any agent. It reads the full loop definition live — steps, connections, evaluators, and all.
              </span>
            </RevealItem>
          </RevealStack>
          <div className="flex items-center justify-center">
            <PocketScene />
          </div>
        </div>
      </ScrollSection>

      {/* ───────────────────────────────────────────────────────────────────
          SECTION 5 — How teams ship with Looper. Rotating quotes.
          rounded-[40px]
         ─────────────────────────────────────────────────────────────────── */}
      <ScrollSection tone="white" radius={40} ariaLabel="What you can build with Looper">
        <div className="mx-auto max-w-4xl">
          <RevealStack className="mb-10 flex flex-col gap-3 text-center">
            <RevealItem as="span" className="t-overline text-indigo-700">
              What teams build with Looper
            </RevealItem>
            <RevealItem as="h2" className="text-[#111]">
              <span
                style={{
                  fontSize: 40,
                  lineHeight: 1.1,
                  letterSpacing: "-0.03em",
                  fontWeight: 700,
                }}
              >
                One sentence in. One loop your whole team and every agent reads.
              </span>
            </RevealItem>
          </RevealStack>
          <QuoteRotator quotes={quotes} />
          <p className="mt-6 text-center t-caption text-[#8E8E93]">
            Illustrative use cases — not customer testimonials.
          </p>
        </div>
      </ScrollSection>

      {/* ───────────────────────────────────────────────────────────────────
          FINAL CTA — accent indigo-600 surface, locked headline reprised.
          rounded-[40px]
         ─────────────────────────────────────────────────────────────────── */}
      <ScrollSection
        tone="accent"
        radius={40}
        ariaLabel="Start free"
        innerClassName="px-6 py-24 sm:py-32 text-center"
      >
        <RevealStack className="mx-auto flex max-w-3xl flex-col items-center gap-6">
          <RevealItem as="h2" className="text-white">
            <span
              style={{
                fontSize: "clamp(40px, 5vw, 64px)",
                lineHeight: 1.04,
                letterSpacing: "-0.035em",
                fontWeight: 700,
              }}
            >
              Build your loop. Ship your agent.
            </span>
          </RevealItem>
          <RevealItem as="p">
            <span
              className="text-indigo-100"
              style={{ fontSize: 18, lineHeight: 1.55 }}
            >
              Describe the loop. Your agent draws it. You refine it. Any agent reads it via MCP. Share or sell it on the marketplace.
            </span>
          </RevealItem>
          <RevealItem
            as="div"
            className="mt-4 flex flex-wrap items-center justify-center gap-3"
          >
            <TrackedLink
              href={home.finalCta.href}
              event="homepage_cta_clicked"
              metadata={{ location: "final_cta" }}
            >
              <span className="inline-flex h-12 items-center gap-1.5 rounded-full bg-white px-7 t-label font-semibold text-indigo-700 transition-colors hover:bg-indigo-50">
                Start free
                <ArrowRight size={14} aria-hidden="true" />
              </span>
            </TrackedLink>
            <Link
              href="/templates"
              className="inline-flex h-12 items-center gap-1.5 t-label font-semibold text-white/90 hover:text-white"
            >
              Or browse starters
            </Link>
          </RevealItem>
        </RevealStack>
      </ScrollSection>

      <div className="h-12" aria-hidden="true" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers — kept in this file so the page reads top to bottom.              */

function pickShowcaseStarters() {
  // Three real catalog starters drawn from distinct categories so the
  // showcase rotation feels broad. Fallback to the first three if any are
  // missing.
  const wanted = [
    "multi-agent-handoff",
    "customer-support-triage",
    "code-review-assistant",
  ];
  const picked = wanted
    .map((id) => starterTemplates.find((t) => t.id === id))
    .filter((t): t is (typeof starterTemplates)[number] => Boolean(t));
  if (picked.length === 3) return picked;
  return starterTemplates.slice(0, 3);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* PocketScene — a pure SVG phone frame holding a tiny graph. No images.     */

function PocketScene() {
  return (
    <svg
      viewBox="0 0 280 480"
      className="h-auto w-full max-w-[300px]"
      role="img"
      aria-label="A phone frame showing the same Looper graph: planner, guard, coder, with a Claude reply below."
    >
      {/* Phone shell */}
      <rect
        x="20"
        y="10"
        width="240"
        height="460"
        rx="40"
        fill="#0F0F12"
        stroke="#1f1f22"
        strokeWidth="2"
      />
      {/* Screen */}
      <rect
        x="32"
        y="22"
        width="216"
        height="436"
        rx="30"
        fill="#0A0A0A"
      />
      {/* Notch */}
      <rect
        x="112"
        y="24"
        width="56"
        height="14"
        rx="7"
        fill="#1f1f22"
      />
      {/* Top chrome */}
      <g>
        <text x="44" y="64" fontSize="9" fontWeight="600" fill="#fff">
          Looper
        </text>
        <text x="78" y="64" fontSize="8" fill="#8E8E93">
          sys_8a72
        </text>
        <circle cx="232" cy="62" r="3" fill="#4F46E5" />
      </g>
      {/* Graph card */}
      <g>
        <rect
          x="44"
          y="80"
          width="192"
          height="172"
          rx="14"
          fill="#101013"
          stroke="#1f1f22"
          strokeWidth="1"
        />
        {/* nodes */}
        {[
          { x: 60, y: 110, label: "Planner" },
          { x: 60, y: 158, label: "Guard" },
          { x: 60, y: 206, label: "Coder" },
        ].map((n, i) => (
          <g key={n.label}>
            <rect
              x={n.x}
              y={n.y}
              width="160"
              height="32"
              rx="8"
              fill="#16161a"
              stroke="#4F46E5"
              strokeWidth="0.75"
            />
            <circle cx={n.x + 12} cy={n.y + 16} r="2.5" fill="#4F46E5" />
            <text
              x={n.x + 22}
              y={n.y + 20}
              fontSize="9"
              fontWeight="600"
              fill="#fff"
            >
              {n.label}
            </text>
            {i < 2 ? (
              <path
                d={`M ${n.x + 12} ${n.y + 32} L ${n.x + 12} ${n.y + 48}`}
                stroke="#4F46E5"
                strokeWidth="0.75"
              />
            ) : null}
          </g>
        ))}
      </g>
      {/* Claude reply */}
      <g>
        <rect
          x="44"
          y="268"
          width="192"
          height="86"
          rx="14"
          fill="#0E0E11"
          stroke="#1f1f22"
        />
        <text x="56" y="288" fontSize="8" fill="#8E8E93">
          Claude (via pipes)
        </text>
        <text x="56" y="308" fontSize="9" fill="#fff" fontWeight="600">
          Planner. Guard. Coder.
        </text>
        <text x="56" y="322" fontSize="8" fill="#C7C7CC">
          Connections between them.
        </text>
        <text x="56" y="340" fontSize="8" fill="#8E8E93">
          Same graph your team reads.
        </text>
      </g>
      {/* Action bar */}
      <g>
        <rect
          x="44"
          y="368"
          width="192"
          height="38"
          rx="12"
          fill="#4F46E5"
        />
        <text
          x="140"
          y="392"
          fontSize="11"
          fontWeight="700"
          fill="#fff"
          textAnchor="middle"
        >
          Hand off
        </text>
      </g>
      {/* Home indicator */}
      <rect
        x="118"
        y="446"
        width="44"
        height="4"
        rx="2"
        fill="#3C3C43"
      />
    </svg>
  );
}

/* HeroSidePreview                                                            */
/* A small static preview rendered next to the hero copy on desktop. It hints */
/* at what the scroll demo will play before the user scrolls.                */

function HeroSidePreview() {
  return (
    <div
      className="relative aspect-[5/4] w-full overflow-hidden rounded-[24px] border border-black/[0.06] bg-white shadow-md-token"
      aria-hidden="true"
    >
      <div className="absolute left-0 right-0 top-0 flex items-center gap-2 border-b border-black/[0.06] bg-white px-3 py-2">
        <span
          className="t-label font-semibold text-[#111]"
          style={{ fontSize: 11 }}
        >
          Looper
</span>
        <span
          className="t-caption text-[#8E8E93]"
          style={{ fontSize: 10 }}
        >
          sys_8a72
        </span>
        <span
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5"
          style={{ fontSize: 9 }}
        >
          <span className="inline-block h-1 w-1 rounded-full bg-indigo-500" />
          <span
            className="t-caption font-semibold text-indigo-700"
            style={{ fontSize: 9 }}
          >
            live
          </span>
        </span>
      </div>
      <div className="absolute inset-0 flex flex-col gap-2 px-4 pb-4 pt-10">
        <div className="rounded-md border border-black/[0.08] bg-[#FAFAFA] px-3 py-2">
          <p
            className="t-caption text-[#8E8E93]"
            style={{ fontSize: 9 }}
          >
            You typed
          </p>
          <p
            className="t-label text-[#111]"
            style={{ fontSize: 11 }}
          >
            Planner agent reads tickets, hands off to a coder.
          </p>
        </div>
        <div className="relative flex-1 overflow-hidden rounded-md border border-black/[0.08] bg-white">
          <svg
            viewBox="0 0 320 200"
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label="Planner node connected by a pipe to a Coder node."
          >
            <defs>
              <pattern
                id="hero-side-grid"
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 16 0 L 0 0 0 16"
                  fill="none"
                  stroke="rgba(0,0,0,0.04)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="320" height="200" fill="url(#hero-side-grid)" />
            <path
              d="M 110 100 C 150 100, 170 100, 210 100"
              stroke="#4F46E5"
              strokeWidth="1.5"
              fill="none"
            />
            <g>
              <rect
                x="40"
                y="82"
                width="70"
                height="36"
                rx="6"
                fill="white"
                stroke="#4F46E5"
                strokeWidth="1.25"
              />
              <text
                x="75"
                y="98"
                fontSize="9"
                fontWeight="600"
                fill="#111"
                textAnchor="middle"
              >
                Planner
              </text>
              <text
                x="75"
                y="110"
                fontSize="7.5"
                fill="#8E8E93"
                textAnchor="middle"
              >
                agent
              </text>
            </g>
            <g>
              <rect
                x="210"
                y="82"
                width="70"
                height="36"
                rx="6"
                fill="white"
                stroke="#4F46E5"
                strokeWidth="1.25"
              />
              <text
                x="245"
                y="98"
                fontSize="9"
                fontWeight="600"
                fill="#111"
                textAnchor="middle"
              >
                Coder
              </text>
              <text
                x="245"
                y="110"
                fontSize="7.5"
                fill="#8E8E93"
                textAnchor="middle"
              >
                agent
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
