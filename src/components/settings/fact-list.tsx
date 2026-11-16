import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Fact {
  label: ReactNode;
  value: ReactNode;
}

/**
 * A ruled label and value readout inside a card: the settings ledger. Labels
 * sit in secondary ink on the left, values in primary ink on the right, and
 * hairlines between rows rather than boxes around them. Below 640px the value
 * drops under its label, so a long value never squeezes the label to nothing.
 */
/** `pending_review` reads as "Pending review": machine values shown in sentence case. */
export function sentenceCase(value: unknown): string {
  const text = String(value ?? "").replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function FactList({ facts, className }: { facts: Fact[]; className?: string }) {
  return (
    <dl className={cn("flex flex-col", className)}>
      {facts.map((fact, index) => (
        <div
          key={index}
          className="flex flex-col gap-1 border-t border-hairline px-4 py-2 first:border-t-0 sm:min-h-[44px] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <dt className="t-body text-ink-2">{fact.label}</dt>
          <dd className="t-body min-w-0 text-ink sm:text-right">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
