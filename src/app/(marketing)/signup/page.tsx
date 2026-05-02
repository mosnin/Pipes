"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GitBranch } from "lucide-react";
import { SignUp } from "@clerk/nextjs";
import { SignupSourceTracker } from "@/components/marketing/SignupSourceTracker";

function SignupForm() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") ?? "direct";

  return (
    <>
      <SignupSourceTracker source={source} />

      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-7">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shrink-0">
            <GitBranch size={18} className="text-white" aria-hidden="true" />
          </span>
          <span
            className="text-[22px] font-bold text-[#111]"
            style={{ letterSpacing: "-0.03em" }}
          >
            Pipes
          </span>
        </div>

        <SignUp
          signInUrl="/login"
          fallbackRedirectUrl="/dashboard"
          appearance={{
            elements: {
              card: "bg-white border border-black/[0.08] rounded-[16px] shadow-md-token",
              headerTitle: "t-h3 text-[#111]",
              headerSubtitle: "t-label text-[#8E8E93]",
              formButtonPrimary:
                "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-700 text-white font-semibold rounded-lg t-label transition-colors",
              socialButtonsBlockButton:
                "bg-white border border-black/[0.14] hover:border-black/[0.24] text-[#111] font-medium rounded-lg t-label transition-colors",
              formFieldInput:
                "w-full h-10 rounded-lg border border-black/[0.08] bg-white px-3 t-label text-[#111] placeholder:text-[#C7C7CC] focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-shadow",
              formFieldLabel: "t-label font-medium text-[#111]",
              footerAction: "hidden",
              footer: "hidden"
            }
          }}
        />

        <p className="mt-5 text-center t-caption text-[#8E8E93]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen surface-subtle flex items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <div className="w-full max-w-md h-[640px] rounded-[12px] bg-white border border-black/[0.08] animate-pulse" />
        }
      >
        <SignupForm />
      </Suspense>
    </main>
  );
}
