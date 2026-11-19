import Link from "next/link";
import type { ReactNode } from "react";
import { Mark } from "@/components/brand/logo";
import { AuthArt } from "@/components/marketing/auth-art";

/* ==========================================================================
   The auth chassis, as Podium ships it: two panels on the canvas. The form
   on a card on the left; shader light and a glimpse of a workflow on the
   right (hidden below lg). The marketing shell is suppressed on these routes.
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
    <main id="main" className="grid min-h-dvh gap-2 bg-canvas p-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col rounded-[20px] border border-border bg-card px-6 py-8 sm:px-10">
        <Link href="/" aria-label="Pipes home" className="focus-ring flex w-fit items-center gap-2 rounded-lg text-foreground">
          <Mark size={26} />
          <span className="text-[17px] font-semibold tracking-tight">Pipes</span>
        </Link>
        <div className="mx-auto flex w-full flex-1 flex-col justify-center py-10" style={{ maxWidth: width }}>
          <div className="t-stagger">
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] text-foreground">{title}</h1>
            {subtitle ? <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p> : null}
          </div>
          <div className="mt-8">{children}</div>
          {footer ? <p className="mt-8 text-[14px] text-muted-foreground">{footer}</p> : null}
        </div>
      </div>
      <AuthArt />
    </main>
  );
}
