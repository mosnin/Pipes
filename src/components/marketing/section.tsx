import type { ReactNode } from "react";
import { Kicker } from "@/components/marketing/kicker";
import { cn } from "@/lib/utils";

export function Container({
  children,
  className,
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}): ReactNode {
  return (
    <div className={cn(wide ? "mk-container-wide" : "mk-container", className)}>
      {children}
    </div>
  );
}

export function Section({
  children,
  className,
  id,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  labelledBy?: string;
}): ReactNode {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("mk-section", className)}
    >
      {children}
    </section>
  );
}

/**
 * Kicker, headline, lead. Left-aligned by default; with a lead it becomes the
 * editorial split, headline on the left and the lead beside its first line.
 */
export function SectionHeading({
  id,
  kicker,
  title,
  lead,
  align = "left",
  className,
}: {
  id: string;
  kicker?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
}): ReactNode {
  if (align === "center" || !lead) {
    return (
      <div
        className={cn(
          "flex flex-col gap-4",
          align === "center" && "mx-auto items-center text-center",
          className,
        )}
      >
        {kicker ? <Kicker>{kicker}</Kicker> : null}
        <h2 id={id} className="t-mk-h2 max-w-[18ch] text-balance text-ink">
          {title}
        </h2>
        {lead ? (
          <p className="t-mk-lead mk-prose text-pretty text-ink-2">{lead}</p>
        ) : null}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-16",
        className,
      )}
    >
      <div className="flex flex-col gap-4">
        {kicker ? <Kicker>{kicker}</Kicker> : null}
        <h2 id={id} className="t-mk-h2 max-w-[18ch] text-balance text-ink">
          {title}
        </h2>
      </div>
      <p className="t-mk-lead mk-prose text-pretty text-ink-2 lg:pt-[36px]">
        {lead}
      </p>
    </div>
  );
}

/** Copy on one side, a real product surface on the other, alternating. */
export function FeatureRow({
  id,
  kicker,
  title,
  children,
  visual,
  reverse = false,
  className,
}: {
  id: string;
  kicker?: string;
  title: ReactNode;
  children: ReactNode;
  visual: ReactNode;
  reverse?: boolean;
  className?: string;
}): ReactNode {
  return (
    <div
      className={cn(
        "grid items-center gap-10 lg:grid-cols-2 lg:gap-16",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-4",
          reverse ? "lg:order-2" : "lg:order-1",
        )}
      >
        {kicker ? <Kicker>{kicker}</Kicker> : null}
        <h2 id={id} className="t-mk-h3 max-w-[22ch] text-balance text-ink">
          {title}
        </h2>
        <div className="t-mk-body flex max-w-[52ch] flex-col gap-3 text-pretty text-ink-2">
          {children}
        </div>
      </div>
      <div className={cn("min-w-0", reverse ? "lg:order-1" : "lg:order-2")}>
        {visual}
      </div>
    </div>
  );
}

/** The raised surface a product scene sits on: one hairline, one elevation. */
export function SceneFrame({
  children,
  className,
  caption,
}: {
  children: ReactNode;
  className?: string;
  caption?: string;
}): ReactNode {
  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <div className="relative w-full overflow-hidden rounded-12 border border-border bg-raised shadow-elev-1">
        {children}
      </div>
      {caption ? (
        <figcaption className="t-caption text-ink-3">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

/** A two-column definition list for detail that reads as term and answer. */
export function SpecList({
  rows,
  className,
}: {
  rows: readonly { term: string; detail: ReactNode; mono?: boolean }[];
  className?: string;
}): ReactNode {
  return (
    <dl
      className={cn(
        "divide-y divide-hairline rounded-12 border border-border bg-raised shadow-elev-1",
        className,
      )}
    >
      {rows.map((row) => (
        <div
          key={row.term}
          className="grid gap-1.5 px-5 py-4 sm:grid-cols-[220px_1fr] sm:gap-6"
        >
          <dt
            className={cn(
              "min-w-0 break-words text-ink",
              row.mono ? "t-mono-hash-lg" : "t-body-strong",
            )}
          >
            {row.term}
          </dt>
          <dd className="t-body min-w-0 text-ink-2">{row.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
