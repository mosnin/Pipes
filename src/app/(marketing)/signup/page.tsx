"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GitBranch, Check, ShieldCheck } from "lucide-react";
import { SignupSourceTracker } from "@/components/marketing/SignupSourceTracker";

const BENEFITS = [
  "3 systems free, no time limit",
  "AI-assisted system design",
  "Connect any agent via MCP",
] as const;

function SignupForm() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") ?? "direct";

  const [name, setName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const nameError = submitted && !name.trim() ? "Your name is required" : null;
  const workspaceError = submitted && !workspaceName.trim() ? "Workspace name is required" : null;

  function handleContinue() {
    setSubmitted(true);
    if (!name.trim() || !workspaceName.trim()) return;
    const url = `/api/auth/login?returnTo=/onboarding&workspace=${encodeURIComponent(workspaceName)}`;
    window.location.href = url;
  }

  const inputClass = (error: string | null) => [
    "w-full h-10 rounded-lg border px-3 t-label text-[#111] placeholder:text-[#C7C7CC]",
    "bg-white focus:outline-none focus:ring-2 transition-shadow",
    error
      ? "border-red-400 bg-red-50 focus:ring-red-200 focus:border-red-400"
      : "border-black/[0.08] focus:ring-indigo-100 focus:border-indigo-400",
  ].join(" ");

  return (
    <>
      <SignupSourceTracker source={source} />

      <div className="w-full max-w-[400px]">

        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shrink-0">
            <GitBranch size={18} className="text-white" aria-hidden="true" />
          </span>
          <span className="text-[22px] font-bold text-[#111]" style={{ letterSpacing: "-0.03em" }}>
            Pipes
          </span>
        </div>

        {/* Card */}
        <div className="bg-white border border-black/[0.08] rounded-2xl px-8 py-9 space-y-6">

          <div className="space-y-1">
            <h1 className="text-[22px] font-bold text-[#111]" style={{ letterSpacing: "-0.02em" }}>
              Create your workspace
            </h1>
            <p className="t-label text-[#8E8E93]">Free forever. No credit card required.</p>
          </div>

          <ul className="space-y-2.5">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2.5 t-label text-[#3C3C43]">
                <Check size={14} className="text-indigo-500 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                {benefit}
              </li>
            ))}
          </ul>

          <div className="h-px bg-black/[0.06]" />

          <div className="space-y-4">

            <div className="space-y-1.5">
              <label htmlFor="signup-name" className="t-label font-medium text-[#111]">
                Your name
              </label>
              <input
                id="signup-name"
                type="text"
                placeholder="Alex Rivera"
                autoComplete="name"
                value={name}
                onChange={(e) => { setName(e.target.value); if (submitted) setSubmitted(false); }}
                className={inputClass(nameError)}
              />
              {nameError && <p className="t-caption text-red-500">{nameError}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="signup-workspace" className="t-label font-medium text-[#111]">
                Workspace name
              </label>
              <input
                id="signup-workspace"
                type="text"
                placeholder="Acme AI"
                autoComplete="organization"
                value={workspaceName}
                onChange={(e) => { setWorkspaceName(e.target.value); if (submitted) setSubmitted(false); }}
                className={inputClass(workspaceError)}
              />
              {workspaceError && <p className="t-caption text-red-500">{workspaceError}</p>}
            </div>

            <button
              type="button"
              onClick={handleContinue}
              className="w-full h-11 bg-[#111] hover:bg-[#222] active:bg-black text-white font-semibold rounded-xl t-label transition-colors"
            >
              Continue
            </button>
          </div>

          <p className="text-center t-caption text-[#8E8E93]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center t-caption text-[#C7C7CC] flex items-center justify-center gap-1.5">
          <ShieldCheck size={12} aria-hidden="true" />
          Secured by Auth0 &mdash; your credentials are never stored by Pipes
        </p>
      </div>
    </>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#F5F5F7] flex items-center justify-center px-6 py-12">
      <Suspense
        fallback={
          <div className="w-full max-w-[400px] h-[520px] rounded-2xl bg-white border border-black/[0.08] animate-pulse" />
        }
      >
        <SignupForm />
      </Suspense>
    </main>
  );
}
