import { useId, type ReactNode } from "react";
import { PageShell, type PageMeasure } from "@/components/layouts/archetypes";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";

/**
 * The frame every workspace settings and operator page shares: the one page
 * measure, the page header, and a stack of sections 32px apart.
 *
 * It no longer draws its own row of section links. The rail already lists
 * every settings page under Workspace, and a second copy of the same links in
 * a card above the content said the same thing twice.
 */
export function SettingsShell({
  title,
  description,
  actions,
  meta,
  measure = "page",
  banner,
  children
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  /** `prose` for a form, `page` (default) for tables. */
  measure?: PageMeasure;
  /** A shader band that carries the page's h1 in place of the plain header; actions sit under it. */
  banner?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageShell measure={measure}>
      {banner ? (
        <div className="mb-8">
          {banner}
          {actions ? <div className="mt-4 flex flex-wrap items-center justify-end gap-2">{actions}</div> : null}
        </div>
      ) : (
        <PageHeader title={title} description={description} actions={actions} meta={meta} />
      )}
      <div className="flex flex-col gap-8">{children}</div>
    </PageShell>
  );
}

/**
 * One titled group on the canvas: the sentence-case heading sits above the
 * object it names, 12px clear of it, the way Company OS settings pages stack.
 */
export function SettingsSection({
  title,
  action,
  description,
  children
}: {
  title: ReactNode;
  action?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id}>
      <SectionHeading action={action} className={description ? "mb-1" : undefined}>
        <span id={id}>{title}</span>
      </SectionHeading>
      {description ? <p className="t-caption mb-3 max-w-[90ch] text-ink-3">{description}</p> : null}
      {children}
    </section>
  );
}
