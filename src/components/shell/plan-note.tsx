import Link from "next/link";
import type { ReactNode } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";

/**
 * Said before the click, not after it: what the current plan leaves out, and
 * the one place to change that.
 */
export function PlanNote({ title, children, className }: { title: string; children?: ReactNode; className?: string }): ReactNode {
  return (
    <Banner
      role="info"
      title={title}
      className={className}
      action={
        <Button asChild variant="secondary" size="sm">
          <Link href="/settings/billing">Upgrade</Link>
        </Button>
      }
    >
      {children}
    </Banner>
  );
}
