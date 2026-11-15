import type { ReactNode } from "react";
import { CutButton } from "@/components/marketing/cut-button";
import { getEntitlements } from "@/domain/templates/plans";

const FREE_SYSTEMS = getEntitlements("Free").maxSystems;

/** The closing band every marketing page ends on. */
export function FinalCta({
  title = "Write the procedure down once.",
  body = `Start free with ${FREE_SYSTEMS} workflows. Upgrade when your team needs shared editing, version history or API and MCP access.`,
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
      <div className="mk-container flex flex-col items-start gap-8 py-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4">
          <h2 id="final-cta-heading" className="t-mk-h2 text-balance text-ink">
            {title}
          </h2>
          <p className="t-mk-lead max-w-[52ch] text-ink-2">{body}</p>
        </div>
        <div className="flex flex-wrap gap-4">
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
