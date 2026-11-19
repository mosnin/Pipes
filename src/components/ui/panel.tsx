import type { ReactNode } from "react";
import { EmptyArt, type EmptyArtKind } from "@/components/ui/empty-art";
import { cn } from "@/lib/utils";

/**
 * Podium's nested card: a soft 20px frame with a quiet label, holding a white
 * 14px card. For a document's self-contained sections.
 */
export function Panel({ label, action, children, className, bodyClassName }: { label: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }): ReactNode {
  return (
    <section className={cn("rounded-[20px] border border-border bg-subtle p-1.5", className)}>
      <div className="flex min-h-9 items-center justify-between gap-3 px-3.5 pb-1.5 pt-1">
        <h2 className="text-[14px] font-normal text-muted-foreground">{label}</h2>
        {action}
      </div>
      <div className={cn("rounded-[14px] bg-card px-5 py-4 shadow-[0_0_0_0.5px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.04)] dark:shadow-[inset_0_0_0_1px_var(--line-border)]", bodyClassName)}>{children}</div>
    </section>
  );
}

/** The quiet 13px section label Podium uses on every page. */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }): ReactNode {
  return (
    <div className="mb-2.5 flex min-h-5 items-center justify-between gap-3">
      <h2 className="text-[13px] font-normal text-muted-foreground">{children}</h2>
      {action}
    </div>
  );
}

/** A quiet empty row for a list that fills on its own: a small figure on a faint sky gradient and one line. */
export function EmptyNote({ children, kind }: { children: ReactNode; kind?: EmptyArtKind }): ReactNode {
  if (!kind) return <p className="rounded-[14px] bg-subtle px-4 py-5 text-[13px] text-muted-foreground">{children}</p>;
  return (
    <div className="flex items-center gap-4 rounded-[14px] bg-gradient-to-r from-sky/[0.08] via-sky/[0.03] to-transparent py-2 pl-2 pr-4">
      <EmptyArt kind={kind} size={76} className="shrink-0" />
      <p className="text-[13px] text-muted-foreground">{children}</p>
    </div>
  );
}
