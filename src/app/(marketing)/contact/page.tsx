import Link from "next/link";
import { ArrowUpRight, Mail, MessageSquare, Shield } from "lucide-react";
import { SectionBadge } from "@/components/marketing/SectionBadge";

export const metadata = {
  title: "Contact - Looper",
  description: "Talk to the Looper team. Sales, support, and security.",
};

const SOURCE_INTRO: Record<string, string> = {
  pricing_bottom_sales:
    "Looking at plans for a team? Tell us your size and what you are building and we will help you pick.",
  customers_contact:
    "Want to talk to someone before you commit? We are happy to walk through your use case.",
  use_cases_contact:
    "Have a use case in mind? Describe it and we will tell you honestly whether Looper fits.",
  careers:
    "Reaching out about working together? Tell us what you have built and what you would build here.",
  dpa: "Need a countersigned DPA? Tell us your entity name and we will send one over.",
  about: "Glad you want to talk. Tell us what is on your mind.",
};

const CHANNELS = [
  {
    icon: MessageSquare,
    title: "Sales",
    body: "Plans, seats, procurement, and anything about rolling Looper out to a team.",
    action: "sales@looper.dev",
    href: "mailto:sales@looper.dev",
  },
  {
    icon: Mail,
    title: "Support",
    body: "Questions about your workspace, the editor, the protocol, or your loops.",
    action: "support@looper.dev",
    href: "mailto:support@looper.dev",
  },
  {
    icon: Shield,
    title: "Security",
    body: "Report a vulnerability or request our security documentation and DPA.",
    action: "security@looper.dev",
    href: "mailto:security@looper.dev",
  },
];

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;
  const intro = (source && SOURCE_INTRO[source]) || "Pick the channel that fits. A real person reads each one.";

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="px-6 pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="surface-subtle rounded-[40px] border border-black/[0.06] px-6 py-24 text-center sm:py-32">
            <SectionBadge label="Contact" />
            <h1
              className="mx-auto mt-6 max-w-3xl text-[#111]"
              style={{ fontSize: 60, lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 700 }}
            >
              Talk to the team.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl t-body leading-relaxed text-[#3C3C43]">
              {intro}
            </p>
          </div>
        </div>
      </section>

      {/* CHANNELS */}
      <section className="px-6 pt-24">
        <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-5">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className="rounded-3xl border border-black/[0.06] bg-white p-7 flex flex-col">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
                  <Icon size={18} aria-hidden="true" />
                </div>
                <h3 className="mt-4 t-title text-[#111]">{c.title}</h3>
                <p className="mt-2 t-body leading-relaxed text-[#3C3C43] flex-1">{c.body}</p>
                <a
                  href={c.href}
                  className="mt-5 inline-flex items-center gap-1.5 t-label font-semibold text-violet-600 hover:text-violet-800"
                >
                  {c.action}
                  <ArrowUpRight size={13} aria-hidden="true" />
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* SELF-SERVE */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl rounded-3xl border border-black/[0.06] bg-white p-8 text-center">
          <h2 className="t-h2 text-[#111]">Prefer to just try it?</h2>
          <p className="mt-2 t-body text-[#3C3C43]">
            Most questions answer themselves once a loop is on the canvas. Start
            free, no card required.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/signup?source=contact"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#111] px-5 py-2.5 t-label font-semibold text-white hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Start building free
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 rounded-xl border border-black/[0.14] px-5 py-2.5 t-label font-semibold text-[#111] hover:bg-black/[0.02] transition-colors"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
