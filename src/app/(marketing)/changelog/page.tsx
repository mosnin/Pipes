import { Rss } from "lucide-react";
import { SectionBadge } from "@/components/marketing/SectionBadge";
import { ChangelogTimeline } from "@/components/marketing/ChangelogTimeline";
import { changelogEntries } from "@/lib/marketing/changelog-data";

export const metadata = {
  title: "Changelog - Pipes",
  description:
    "What shipped on Pipes. Builder turns, schema migrations, MCP capabilities, editor improvements. Read the timeline.",
};

export default function ChangelogPage() {
  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="px-6 pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="surface-subtle rounded-[40px] border border-black/[0.06] px-6 py-24 sm:py-28">
            <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <SectionBadge label="Changelog" />
                <h1
                  className="mt-6 max-w-2xl text-[#111]"
                  style={{
                    fontSize: 60,
                    lineHeight: 1.04,
                    letterSpacing: "-0.04em",
                    fontWeight: 700,
                  }}
                >
                  What shipped.
                </h1>
                <p className="mt-6 max-w-xl t-body leading-relaxed text-[#3C3C43]">
                  Every release that touches the editor, the protocol, or the
                  builder. Dated, versioned, and linkable.
                </p>
              </div>
              <a
                href="/changelog.rss"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-black/[0.08] bg-white px-5 t-label font-semibold text-[#111] transition-colors hover:border-black/[0.16]"
              >
                <Rss size={14} aria-hidden="true" />
                Subscribe to RSS
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="px-6 pt-20 pb-24">
        <div className="mx-auto max-w-4xl">
          <ChangelogTimeline entries={changelogEntries} />
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-col items-start justify-between gap-6 rounded-[32px] border border-black/[0.06] bg-[#FAFAFA] p-10 sm:flex-row sm:items-center">
            <div>
              <h3 className="t-h2 text-[#111]">Want updates?</h3>
              <p className="mt-2 t-body text-[#3C3C43]">
                The RSS feed is the source of truth. New entry lands the same
                minute the deploy completes.
              </p>
            </div>
            <a
              href="/changelog.rss"
              className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#111] px-6 t-label font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              <Rss size={14} aria-hidden="true" />
              Subscribe
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
