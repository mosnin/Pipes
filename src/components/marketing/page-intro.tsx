import type { ReactNode } from "react";
import { Kicker } from "@/components/marketing/kicker";

/** Every inner page opens the same way: kicker, solid headline, lead, actions. */
export function PageIntro({
  kicker,
  title,
  lead,
  children,
}: {
  kicker: ReactNode;
  title: string;
  lead: string;
  children?: ReactNode;
}): ReactNode {
  return (
    <section aria-labelledby="page-title" className="relative">
      <div className="mk-container relative flex flex-col gap-6 pb-16 pt-16">
        <Kicker>{kicker}</Kicker>
        <h1
          id="page-title"
          className="t-mk-hero max-w-[18ch] text-balance text-ink"
        >
          {title}
        </h1>
        <p className="t-mk-lead max-w-[60ch] text-pretty text-ink-2">{lead}</p>
        {children}
      </div>
    </section>
  );
}
