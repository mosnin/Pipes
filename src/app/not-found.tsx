import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, FileQuestion } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound(): ReactNode {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4">
      <EmptyState
        icon={FileQuestion}
        titleAs="h1"
        title="Page not found"
        body="This link may be old, or the page may have moved."
        action={
          <Button asChild variant="primary">
            <Link href="/">
              <ArrowLeft aria-hidden="true" />
              Return home
            </Link>
          </Button>
        }
        secondaryAction={
          <Button asChild variant="secondary">
            <Link href="/dashboard">Open your workspace</Link>
          </Button>
        }
      />
    </main>
  );
}
