"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SignIn } from "@clerk/nextjs";
import { clientRuntimeFlags } from "@/lib/env/client";

// Clerk's <SignIn> wrapped with our design tokens. Mirrors SignupForm so the
// two screens feel like one product. Returning users land back on the
// dashboard, not the welcome wizard.
// In mock mode ClerkProvider is not mounted, so render the demo entry instead
// of a Clerk widget that can never load.
export function LoginForm() {
  if (clientRuntimeFlags.useMocks) {
    return (
      <div className="w-full max-w-sm mx-auto">
        <h1 className="t-h1 text-[#111]">Sign in.</h1>
        <p className="mt-3 t-body text-[#3C3C43]">
          Pick up where your team left off.
        </p>
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-6 t-label font-semibold text-white transition-colors hover:bg-violet-700"
          >
            Continue to your workspace
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <p className="mt-4 text-center t-caption text-[#8E8E93]">
            Demo environment — no account needed.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full max-w-sm mx-auto">
      <h1 className="t-h1 text-[#111]">Sign in.</h1>
      <p className="mt-3 t-body text-[#3C3C43]">
        Pick up where your team left off.
      </p>

      <div className="mt-8">
        <SignIn
          signUpUrl="/signup"
          fallbackRedirectUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-transparent border-0 shadow-none p-0",
              header: "hidden",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              formButtonPrimary:
                "bg-violet-600 hover:bg-violet-700 active:bg-violet-700 text-white font-semibold rounded-lg t-label transition-colors h-10",
              socialButtonsBlockButton:
                "bg-white border border-black/[0.14] hover:border-black/[0.24] text-[#111] font-medium rounded-lg t-label transition-colors h-10",
              socialButtonsBlockButtonText: "text-[#111] font-medium",
              formFieldInput:
                "w-full h-10 rounded-lg border border-black/[0.08] bg-white px-3 t-label text-[#111] placeholder:text-[#C7C7CC] focus:outline-none focus:ring-2 focus:ring-violet-100 focus:border-violet-400 transition-shadow",
              formFieldLabel: "t-label font-medium text-[#111]",
              dividerText: "t-caption text-[#8E8E93]",
              dividerLine: "bg-black/[0.08]",
              footer: "hidden",
              footerAction: "hidden",
              identityPreviewText: "t-label text-[#3C3C43]",
              identityPreviewEditButton:
                "text-violet-600 hover:text-violet-700 font-medium",
              formResendCodeLink:
                "text-violet-600 hover:text-violet-700 font-medium",
            },
            variables: {
              fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
              colorPrimary: "#4F46E5",
              colorText: "#111111",
              colorTextSecondary: "#3C3C43",
              colorBackground: "transparent",
              borderRadius: "8px",
            },
          }}
        />
      </div>

      <p className="mt-6 t-label text-[#8E8E93]">
        No account yet?{" "}
        <Link
          href="/signup"
          className="text-violet-600 font-medium hover:text-violet-700 transition-colors"
        >
          Create a workspace
        </Link>
      </p>
    </div>
  );
}
