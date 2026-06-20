import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SectionBadge } from "@/components/marketing/SectionBadge";

export const metadata = {
  title: "Careers - Looper",
  description:
    "We are a small team building the loop layer for agent systems. How we work, and how to reach us.",
};

const HOW_WE_WORK = [
  {
    title: "Small team, high trust",
    body: "Few people, wide ownership. You ship the thing end to end, from the idea to the deploy, and you own the outcome.",
  },
  {
    title: "Taste is a requirement",
    body: "We sweat the empty state, the first run, the copy on the button. If a user needs instructions, the design failed.",
  },
  {
    title: "Delete before adding",
    body: "We question every abstraction and every feature. The best pull request is often the one that removes code.",
  },
  {
    title: "Write it down",
    body: "Decisions live in the graph, the PR, and the doc, not in someone's head. Clarity scales; tribal knowledge does not.",
  },
];

export default function CareersPage() {
  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="px-6 pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="surface-subtle rounded-[40px] border border-black/[0.06] px-6 py-24 text-center sm:py-32">
            <SectionBadge label="Careers" />
            <h1
              className="mx-auto mt-6 max-w-3xl text-[#111]"
              style={{ fontSize: 60, lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 700 }}
            >
              Build the loop layer for agents.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl t-body leading-relaxed text-[#3C3C43]">
              We are a small team with a large ambition: make the loop the
              shared artifact for every agent system. If that sounds like your
              kind of problem, we would like to meet you.
            </p>
          </div>
        </div>
      </section>

      {/* HOW WE WORK */}
      <section className="px-6 pt-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="t-h1 text-[#111] mb-10" style={{ letterSpacing: "-0.025em" }}>
            How we work
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {HOW_WE_WORK.map((p) => (
              <div key={p.title} className="rounded-3xl border border-black/[0.06] bg-white p-7">
                <h3 className="t-title text-[#111] mb-2">{p.title}</h3>
                <p className="t-body leading-relaxed text-[#3C3C43]">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OPEN ROLES */}
      <section className="px-6 pt-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="t-h1 text-[#111]" style={{ letterSpacing: "-0.025em" }}>
            Open roles
          </h2>
          <div className="mt-6 rounded-3xl border border-black/[0.06] bg-white p-8">
            <p className="t-body leading-relaxed text-[#3C3C43]">
              We do not have formal openings posted right now. We still want to
              hear from exceptional product engineers, designers, and applied AI
              folks who care about agent systems. We hire ahead of roles when we
              meet the right person.
            </p>
            <p className="mt-3 t-body leading-relaxed text-[#3C3C43]">
              Tell us what you have built and what you would build here. Short
              and specific beats long and generic.
            </p>
            <Link
              href="/contact?source=careers"
              className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-[#111] px-5 py-2.5 t-label font-semibold text-white hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              Introduce yourself
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <div className="py-16" />
    </div>
  );
}
