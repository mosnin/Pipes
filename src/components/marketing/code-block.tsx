import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A labelled, sideways-scrolling block of real request text. */
export function CodeBlock({
  label,
  code,
  className,
}: {
  label: string;
  code: string;
  className?: string;
}): ReactNode {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-12 border border-border bg-raised shadow-elev-1",
        className,
      )}
    >
      <figcaption className="t-caption border-b border-hairline px-6 py-4 text-ink-3">
        {label}
      </figcaption>
      <pre
        tabIndex={0}
        className="focus-ring-inset t-mono-code overflow-x-auto bg-inset px-6 py-5 text-ink outline-none"
      >
        <code>{code}</code>
      </pre>
    </figure>
  );
}
