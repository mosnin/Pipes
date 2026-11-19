import type { ReactNode } from "react";

/**
 * Each marketing page chooses its own chassis, as Company OS does: content
 * pages render inside MarketingShell, while login, signup and invites use
 * AuthFrame with the shell suppressed.
 */
export default function MarketingLayout({ children }: { children: ReactNode }): ReactNode {
  return children;
}
