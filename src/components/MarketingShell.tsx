import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHeader } from "@/components/marketing/header";

/**
 * The logged-out chassis, as Company OS ships it. `company-marketing` scopes
 * the marketing tokens and type roles (src/app/marketing.css); the header is
 * fixed, so the main column starts below it. Auth routes do not use it: like
 * Company OS, sign-in and sign-up suppress the shell (see AuthFrame).
 */
export function MarketingShell({ children }: { children: ReactNode }): ReactNode {
  return (
    <div className="company-marketing">
      <a
        href="#main-content"
        className="t-caption-medium focus-ring-canvas sr-only rounded-8 border border-strong bg-raised px-2 text-ink outline-none focus:not-sr-only focus:fixed focus:top-1.5 focus:left-1.5 focus:z-[60] focus:inline-flex focus:h-8 focus:items-center"
      >
        Skip to content
      </a>
      <MarketingHeader />
      <main id="main-content" tabIndex={-1} className="pt-[88px] outline-none">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
