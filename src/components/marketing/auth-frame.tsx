import Link from "next/link";
import type { ReactNode } from "react";
import { Mark } from "@/components/brand/logo";

/* ==========================================================================
   The auth chassis, as Company OS ships it: a centred column, a raised tile
   holding the mark, a solid headline, a one-line subtitle, the form, and one
   line of footer. The marketing shell is suppressed on these routes.
   ========================================================================== */

export function AuthFrame({
  title,
  subtitle,
  children,
  footer,
  width = 384,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}): ReactNode {
  return (
    <main
      id="main"
      className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-12"
    >
      <div className="w-full" style={{ maxWidth: width }}>
        <div className="flex flex-col items-center text-center">
          <Link
            href="/"
            aria-label="Pipes home"
            className="focus-ring-canvas flex size-[64px] items-center justify-center rounded-16 border border-border bg-raised text-ink shadow-elev-2 focus-visible:outline-none"
          >
            <Mark size={30} />
          </Link>
          <h1 className="t-title-1 mt-8 text-ink">{title}</h1>
          {subtitle ? <p className="t-body mt-3 text-ink-2">{subtitle}</p> : null}
        </div>
        <div className="mt-10">{children}</div>
        {footer ? (
          <p className="t-body mt-9 text-center text-ink-2">{footer}</p>
        ) : null}
      </div>
    </main>
  );
}
