import type { ReactNode } from "react";

/**
 * LegalDocument
 *
 * A clean, single-column reading layout for legal and policy pages
 * (Terms, Privacy, DPA). One job: be readable. A sticky table of contents
 * on the left for wide screens, the prose on the right.
 */

export interface LegalSection {
  id: string;
  heading: string;
  body: ReactNode;
}

export interface LegalDocumentProps {
  title: string;
  lastUpdated: string;
  intro: ReactNode;
  sections: ReadonlyArray<LegalSection>;
}

export function LegalDocument({ title, lastUpdated, intro, sections }: LegalDocumentProps) {
  return (
    <div className="bg-white">
      {/* Header */}
      <section className="px-6 pt-10">
        <div className="mx-auto max-w-3xl">
          <p className="t-overline text-[#4F46E5] mb-2">Legal</p>
          <h1 className="t-h1 text-[#111]" style={{ letterSpacing: "-0.025em" }}>
            {title}
          </h1>
          <p className="mt-3 t-caption text-[#8E8E93]">Last updated {lastUpdated}</p>
          <div className="mt-6 t-body leading-relaxed text-[#3C3C43]">{intro}</div>
        </div>
      </section>

      {/* Body */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
          {/* Sticky TOC */}
          <aside className="hidden lg:block">
            <nav aria-label="On this page" className="sticky top-24">
              <p className="t-overline text-[#8E8E93] mb-3">Contents</p>
              <ul className="flex flex-col gap-2">
                {sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="t-label text-[#3C3C43] hover:text-indigo-700 transition-colors"
                    >
                      {s.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Prose */}
          <article className="min-w-0 max-w-[720px] flex flex-col gap-10">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <h2 className="t-h3 text-[#111] mb-3" style={{ letterSpacing: "-0.02em" }}>
                  {s.heading}
                </h2>
                <div className="t-body leading-relaxed text-[#3C3C43] flex flex-col gap-3">
                  {s.body}
                </div>
              </section>
            ))}
          </article>
        </div>
      </section>
    </div>
  );
}
