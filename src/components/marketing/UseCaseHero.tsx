// Use-case detail page hero. Story-style. Rounded-40 surface-subtle panel
// with the persona's role + company, the headline outcome, and a short
// preface paragraph. Below that, the inline metrics row.
//
// Server component. Static. Reveals happen below the fold in story sections.

import type { UseCaseMetric } from "./UseCaseMetricsRow";
import { UseCaseMetricsRow } from "./UseCaseMetricsRow";
import { SectionBadge } from "./SectionBadge";

interface UseCaseHeroProps {
  eyebrow?: string;
  persona: string;
  role: string;
  company: string;
  headline: string;
  intro: string;
  metrics: readonly UseCaseMetric[];
}

export function UseCaseHero({
  eyebrow = "Case study",
  persona,
  role,
  company,
  headline,
  intro,
  metrics,
}: UseCaseHeroProps) {
  return (
    <section className="px-6 pt-10">
      <div className="mx-auto max-w-6xl">
        <div className="surface-subtle rounded-[40px] border border-black/[0.06] p-10 sm:p-14">
          <SectionBadge label={eyebrow} />

          <div className="mt-6 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#111] text-white t-label font-semibold">
              {persona
                .split(" ")
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase()}
            </span>
            <div className="flex flex-col">
              <span className="t-label font-semibold text-[#111]">
                {persona}
              </span>
              <span className="t-caption text-[#8E8E93]">
                {role} at {company}
              </span>
            </div>
          </div>

          <h1
            className="mt-8 text-[#111] max-w-3xl"
            style={{
              fontSize: 52,
              lineHeight: 1.05,
              letterSpacing: "-0.035em",
              fontWeight: 700,
            }}
          >
            {headline}
          </h1>

          <p className="mt-6 t-body text-[#3C3C43] max-w-2xl leading-relaxed">
            {intro}
          </p>

          <div className="mt-10">
            <UseCaseMetricsRow metrics={metrics} />
          </div>
        </div>
      </div>
    </section>
  );
}
