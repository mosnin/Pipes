import type { ReactNode } from "react";
import { Mark } from "@/components/brand/logo";
import { CutButton, type Track } from "@/components/marketing/cut-button";
import { Kicker } from "@/components/marketing/kicker";
import {
  StepList,
  TemplateGraph,
  findStarterTemplate,
  nodeTypeLabel,
} from "@/components/marketing/template-graph";

/* ==========================================================================
   The hero: centred copy above a product window, shown flat. The headline is
   solid ink (anti-slop rule 2) and there is no badge above it (rule 10); the
   kicker is a section label, set the way every other section opens.

   The window is a real starter template, read from the catalog, laid out
   the way the editor opens it. No invented workspace, no invented people.
   ========================================================================== */

type Cta = { label: string; href: string; track: Track };

export function Hero({
  title,
  lead,
  primary,
  secondary,
  templateId,
}: {
  title: string;
  lead: string;
  primary: Cta;
  secondary: Cta;
  templateId: string;
}): ReactNode {
  const template = findStarterTemplate(templateId);
  return (
    <section aria-labelledby="hero-title" className="relative">
      <div className="mk-container-wide relative flex flex-col gap-16 pt-16">
        <div className="mx-auto flex w-full max-w-[800px] flex-col items-center gap-6 text-center">
          <Kicker>Pipes</Kicker>
          <h1 id="hero-title" className="t-mk-hero text-balance text-ink">
            {title}
          </h1>
          <p className="t-mk-lead max-w-[56ch] text-pretty text-ink-2">{lead}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <CutButton href={primary.href} size="lg" track={primary.track}>
              {primary.label}
            </CutButton>
            <CutButton
              href={secondary.href}
              variant="outline"
              size="lg"
              track={secondary.track}
            >
              {secondary.label}
            </CutButton>
          </div>
        </div>

        {template ? (
          <div className="relative mx-auto w-full max-w-[1040px] pb-4 lg:pb-16">
            <figure className="overflow-hidden rounded-12 border border-border bg-raised shadow-elev-2">
              <div className="flex items-center justify-between gap-4 border-b border-hairline px-4 py-2">
                <span className="flex min-w-0 items-center gap-1.5 text-ink">
                  <Mark size={16} />
                  <span className="t-caption truncate text-ink-2">
                    Templates / {template.title}
                  </span>
                </span>
                <span className="t-mono-hash shrink-0 text-ink-3 tabular">
                  {template.nodes.length} steps · {template.pipes.length} pipes
                </span>
              </div>
              <div className="grid lg:grid-cols-[220px_1fr]">
                <div className="hidden border-r border-hairline px-4 py-4 lg:block">
                  <p className="t-label-caps text-ink-3">Steps</p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {template.nodes.map((node) => (
                      <li key={node.id} className="flex flex-col gap-0.5">
                        <span className="t-body-medium text-ink">{node.title}</span>
                        <span className="t-caption text-ink-3">
                          {nodeTypeLabel(node.type)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex min-h-[280px] items-center bg-inset px-4 py-10 sm:px-10">
                  <TemplateGraph
                    template={template}
                    listOnMobile={false}
                    className="hidden w-full sm:block"
                  />
                  <StepList template={template} className="w-full sm:hidden" />
                </div>
              </div>
              <figcaption className="t-caption border-t border-hairline px-4 py-2 text-ink-3">
                {template.description} The {template.title} starter template, as
                it opens in the editor.
              </figcaption>
            </figure>
          </div>
        ) : null}
      </div>
    </section>
  );
}
