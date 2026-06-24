"use client";

import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

// Clerk's <SignUp> wrapped with our design tokens. The Clerk component owns
// the auth wiring; we only style it to match the design system: indigo
// primary button, Geist font, ink type, no purple Clerk default.
//
// `afterSignUpUrl` routes new accounts into the onboarding wizard, never
// straight to the dashboard. Existing returning sessions still land on the
// dashboard via Clerk's middleware.
export function SignupForm() {
  return (
    <div className="w-full max-w-sm mx-auto">
      <h1 className="t-h1 text-[#111]">Create your workspace.</h1>
      <p className="mt-3 t-body text-[#3C3C43]">
        One sentence. Watch your first system build itself.
      </p>

      <div className="mt-8">
        <SignUp
          signInUrl="/login"
          forceRedirectUrl="/welcome"
          fallbackRedirectUrl="/welcome"
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
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-violet-600 font-medium hover:text-violet-700 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
