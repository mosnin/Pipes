import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionBadge } from "@/components/marketing/SectionBadge";
import { starterTemplates } from "@/domain/templates/catalog";
import { nodeTypeValues } from "@/domain/looper_schema_v1/schema";

export const metadata = {
  title: "About - Looper",
  description:
    "Why Looper exists: one loop definition that humans and agents both read.",
};

const PRINCIPLES = [
  {
    title: "One sentence in.",
    body: "You describe a loop in plain language. The agent draws it. The fastest path from idea to a working system is a sentence, not a blank canvas.",
  },
  {
    title: "Delete before adding.",
    body: "Every node, every menu, every line of code earns its place or it goes. Complexity is the enemy of a system you can actually reason about.",
  },
  {
    title: "Humans and agents read the same map.",
    body: "A loop is not a picture for humans and a config for machines. It is one typed definition that both read, edit, and trust.",
  },
  {
    title: "The graph is the contract.",
    body: "Before any code runs, your team and your agents agree on the same graph. Review happens on nodes, not in a thread no one can find later.",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="px-6 pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="surface-subtle rounded-[40px] border border-black/[0.06] px-6 py-24 text-center sm:py-32">
            <SectionBadge label="About" />
            <h1
              className="mx-auto mt-6 max-w-3xl text-[#111]"
              style={{ fontSize: 60, lineHeight: 1.04, letterSpacing: "-0.04em", fontWeight: 700 }}
            >
              Build agent loops the way you think about them.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl t-body leading-relaxed text-[#3C3C43]">
              Agent systems are loops: plan, act, observe, repeat. Looper makes
              that loop visible, typed, and shareable, so the map in your head
              matches the one your agents run.
            </p>
          </div>
        </div>
      </section>

      {/* STORY */}
      <section className="px-6 pt-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="t-h1 text-[#111]" style={{ letterSpacing: "-0.025em" }}>
            Why we built it
          </h2>
          <div className="mt-5 flex flex-col gap-4 t-body leading-relaxed text-[#3C3C43]">
            <p>
              Everyone building with agents hits the same wall. The system lives
              in three places at once: a diagram on a whiteboard, a paragraph in
              a doc, and the actual code. None of them agree. The agent reads the
              code. The team argues about the diagram. The doc is already stale.
            </p>
            <p>
              We thought the artifact should be one thing. Describe the loop
              once. Get a typed graph that the editor renders for humans and the
              protocol serves to any agent. Change it in one place and everyone,
              human and machine, sees the change.
            </p>
            <p>
              So Looper is small on purpose. A real graph editor. A handful of
              typed node kinds. One protocol endpoint. An agent that builds with
              you instead of generating a picture and walking away.
            </p>
          </div>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section className="px-6 pt-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="t-h1 text-[#111] mb-10" style={{ letterSpacing: "-0.025em" }}>
            What we believe
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {PRINCIPLES.map((p) => (
              <div
                key={p.title}
                className="rounded-3xl border border-black/[0.06] bg-white p-7"
              >
                <h3 className="t-title text-[#111] mb-2">{p.title}</h3>
                <p className="t-body leading-relaxed text-[#3C3C43]">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FACTS */}
      <section className="px-6 pt-24">
        <div className="mx-auto max-w-6xl grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { value: `${nodeTypeValues.length}`, label: "typed node kinds" },
            { value: `${starterTemplates.length}`, label: "starter templates" },
            { value: "1", label: "protocol endpoint, any agent" },
          ].map((f) => (
            <div key={f.label} className="rounded-3xl border border-black/[0.06] bg-white p-7 text-center">
              <div className="text-[#111]" style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em" }}>
                {f.value}
              </div>
              <div className="mt-1 t-caption text-[#8E8E93]">{f.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl text-center flex flex-col items-center gap-5">
          <h2 className="t-h1 text-[#111]" style={{ letterSpacing: "-0.025em" }}>
            Describe your first loop.
          </h2>
          <p className="t-body text-[#3C3C43] max-w-md">
            Free to start. No card required. One sentence is enough.
          </p>
          <Link
            href="/signup?source=about_cta"
            className="inline-flex items-center gap-2 bg-[#111] text-white rounded-xl px-6 py-3 t-label font-semibold hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Start building free
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}
