import type { ReactNode } from "react";
import { CutButton } from "@/components/marketing/cut-button";
import { getEntitlements } from "@/domain/templates/plans";
import { MONTHLY_INCLUDED } from "@/domain/usage/service";

const FREE_SYSTEMS = getEntitlements("Free").maxSystems;
const FREE_RUNS = MONTHLY_INCLUDED.Free.runs;

/** The closing band every marketing page ends on. */
export function FinalCta({
  title = "Write the workflow down once.",
  body = `Start free with ${FREE_SYSTEMS} workflows and ${FREE_RUNS} runs a month. Upgrade when your agents need API and MCP access, or your team needs shared editing and version history.`,
  source,
}: {
  title?: string;
  body?: string;
  /** Recorded as the signup entry source, so every page's CTA is attributable. */
  source: string;
}): ReactNode {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="border-t border-hairline"
    >
      <div className="mk-container flex flex-col items-start gap-6 py-16 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <h2 id="final-cta-heading" className="t-mk-h2 text-balance text-ink">
            {title}
          </h2>
          <p className="t-mk-lead max-w-[52ch] text-ink-2">{body}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CutButton
            href={`/signup?source=${source}`}
            size="lg"
            track={{ event: "signup_started", metadata: { source } }}
          >
            Start free workspace
          </CutButton>
          <CutButton
            href="/pricing"
            variant="outline"
            size="lg"
            track={{ event: "pricing_cta_clicked", metadata: { source } }}
          >
            Compare plans
          </CutButton>
        </div>
      </div>
    </section>
  );
}
