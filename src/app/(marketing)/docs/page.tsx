import Link from "next/link";
import { Card, Chip, Button } from "@heroui/react";
import { GitBranch } from "lucide-react";

export const metadata = {
  title: "Pipes Documentation",
  description: "Everything you need to design and run AI systems.",
};

const DOC_SECTIONS = [
  {
    emoji: "📖",
    label: "Protocol API",
    description: "Stable MCP/REST surfaces for agent and human consumers.",
    href: "/protocol",
    comingSoon: false,
  },
  {
    emoji: "🚀",
    label: "Quick Start",
    description: "Get a working system running in under five minutes.",
    href: "/templates",
    comingSoon: false,
  },
  {
    emoji: "🤖",
    label: "Agent Builder",
    description: "Configure, run, and review AI agents inside your workspace.",
    href: "/use-cases",
    comingSoon: false,
  },
  {
    emoji: "📦",
    label: "Handoff",
    description: "Transfer work between humans and agents with full context.",
    href: "/use-cases",
    comingSoon: false,
  },
  {
    emoji: "🛡️",
    label: "Governance",
    description: "Policy controls, approval gates, and audit trails.",
    href: "/pricing",
    comingSoon: false,
  },
  {
    emoji: "💬",
    label: "Community",
    description: "Forums, Discord, and shared patterns from the community.",
    href: "#",
    comingSoon: true,
  },
] as const;

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-slate-50 to-white pt-20 pb-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900">
            Pipes Documentation
          </h1>
          <p className="mt-4 text-lg text-slate-500">
            Everything you need to design and run AI systems
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="https://github.com/pipes-ai/pipes"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="outline"
                size="sm"
                className="border-slate-300 text-slate-700 font-medium hover:border-slate-500 transition-colors"
              >
                <GitBranch className="w-4 h-4" aria-hidden />
                View on GitHub
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section grid ───────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DOC_SECTIONS.map(({ emoji, label, description, href, comingSoon }) => {
            const cardContent = (
              <Card
                className={[
                  "border transition-all duration-200 h-full",
                  comingSoon
                    ? "border-slate-100 bg-slate-50 opacity-60 cursor-default"
                    : "border-slate-100 bg-white hover:border-indigo-300 hover:shadow-md hover:bg-indigo-50/30 cursor-pointer",
                ].join(" ")}
              >
                <Card.Content className="p-6 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="text-3xl leading-none"
                      role="img"
                      aria-label={label}
                    >
                      {emoji}
                    </span>
                    {comingSoon && (
                      <Chip
                        size="sm"
                        variant="soft"
                        color="default"
                        className="text-xs font-medium text-slate-400 bg-slate-100"
                      >
                        Coming soon
                      </Chip>
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-base">
                      {label}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                      {description}
                    </p>
                  </div>
                </Card.Content>
              </Card>
            );

            if (comingSoon) {
              return <div key={label}>{cardContent}</div>;
            }

            return (
              <Link key={label} href={href} className="group">
                {cardContent}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
