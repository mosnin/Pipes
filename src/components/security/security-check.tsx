"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TwoStepSetup } from "@/components/security/account-security";

/** The action for a blocked sign-in: two-step setup, or a way out for an email the workspace does not allow. */
export function SecurityCheck({ reason }: { reason: "two_step" | "domain" }): ReactNode {
  const router = useRouter();
  if (reason === "two_step") {
    return (
      <TwoStepSetup
        onDone={() => {
          router.push("/dashboard");
          router.refresh();
        }}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="t-body text-ink-2">Ask an Admin of the workspace to add your domain, or sign in with your work email.</p>
      <Button asChild variant="primary" size="lg" className="w-full">
        <a href="/api/auth/logout">Sign out</a>
      </Button>
    </div>
  );
}
