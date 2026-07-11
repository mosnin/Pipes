"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/marketing/AuthShell";
import { SignupForm } from "@/components/marketing/SignupForm";
import { SignupSourceTracker } from "@/components/marketing/SignupSourceTracker";

function SignupBody() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") ?? "direct";
  return (
    <>
      <SignupSourceTracker source={source} />
      <SignupForm />
    </>
  );
}

export default function SignupPage() {
  return (
    <AuthShell breadcrumb="Create your workspace">
      <Suspense
        fallback={
          <div className="w-full max-w-sm mx-auto h-[480px] rounded-2xl bg-white/40 animate-pulse" />
        }
      >
        <SignupBody />
      </Suspense>
    </AuthShell>
  );
}
