"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GitBranch, ShieldCheck } from "lucide-react";
import { CardShell, CardBody, CardFooter, CardHeader } from "@/components/ui";
import { SignupSourceTracker } from "@/components/marketing/SignupSourceTracker";

function SignupForm() {
  const searchParams = useSearchParams();
  const source = searchParams.get("source") ?? "direct";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const nameError = submitted && !name.trim() ? "Your name is required" : null;
  const emailError = submitted && !email.trim() ? "Work email is required" : null;
  const workspaceError =
    submitted && !workspaceName.trim() ? "Workspace name is required" : null;
  const passwordError =
    submitted && password.length < 8
      ? "Password must be at least 8 characters"
      : null;
  const confirmError =
    submitted && password !== confirmPassword ? "Passwords must match" : null;
  const agreedError = submitted && !agreed ? "You must accept the terms" : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    if (
      !name.trim() ||
      !email.trim() ||
      !workspaceName.trim() ||
      password.length < 8 ||
      password !== confirmPassword ||
      !agreed
    ) {
      return;
    }
    const url = `/api/auth/login?returnTo=/dashboard&workspace=${encodeURIComponent(workspaceName)}`;
    window.location.href = url;
  }

  function inputClass(error: string | null) {
    return [
      "w-full h-10 rounded-lg border px-3 t-label text-[#111] placeholder:text-[#C7C7CC]",
      "bg-white focus:outline-none focus:ring-2 transition-shadow",
      error
        ? "border-[#DC2626] bg-[#FEF2F2] focus:ring-red-100 focus:border-[#DC2626]"
        : "border-black/[0.08] focus:ring-indigo-100 focus:border-indigo-400",
    ].join(" ");
  }

  return (
    <>
      <SignupSourceTracker source={source} />

      <div className="w-full max-w-2xl">
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

        <CardShell className="shadow-sm-token">
          <CardHeader className="text-center">
            <h1 className="t-h3 text-[#111]">Create your workspace</h1>
            <p className="mt-1 t-label text-[#8E8E93]">
              Free forever. No credit card required.
            </p>
          </CardHeader>

          <CardBody>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name" className="t-label font-medium text-[#111]">
                    Your name
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Alex Rivera"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass(nameError)}
                  />
                  {nameError && (
                    <p className="t-caption text-[#991B1B]">{nameError}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="t-label font-medium text-[#111]">
                    Work email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="alex@acme.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass(emailError)}
                  />
                  {emailError && (
                    <p className="t-caption text-[#991B1B]">{emailError}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label
                    htmlFor="workspace"
                    className="t-label font-medium text-[#111]"
                  >
                    Workspace name
                  </label>
                  <input
                    id="workspace"
                    type="text"
                    autoComplete="organization"
                    placeholder="Acme AI"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className={inputClass(workspaceError)}
                  />
                  {workspaceError && (
                    <p className="t-caption text-[#991B1B]">{workspaceError}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="password"
                    className="t-label font-medium text-[#111]"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass(passwordError)}
                  />
                  {passwordError && (
                    <p className="t-caption text-[#991B1B]">{passwordError}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="confirm"
                    className="t-label font-medium text-[#111]"
                  >
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass(confirmError)}
                  />
                  {confirmError && (
                    <p className="t-caption text-[#991B1B]">{confirmError}</p>
                  )}
                </div>
              </div>

              <label className="flex items-start gap-2.5 t-label text-[#3C3C43] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-black/[0.14] text-indigo-600 focus:ring-indigo-200"
                />
                <span>
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    className="text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {agreedError && (
                <p className="t-caption text-[#991B1B] -mt-2">{agreedError}</p>
              )}

              <button
                type="submit"
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-700 text-white font-semibold rounded-lg t-label transition-colors"
              >
                Create account
              </button>
            </form>
          </CardBody>

          <CardFooter className="!justify-center">
            <p className="t-caption text-[#8E8E93]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </CardShell>

        <p className="mt-5 text-center t-caption text-[#C7C7CC] flex items-center justify-center gap-1.5">
          <ShieldCheck size={12} aria-hidden="true" />
          Secured by Auth0 - your credentials are never stored by Pipes
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
          <div className="w-full max-w-2xl h-[640px] rounded-[12px] bg-white border border-black/[0.08] animate-pulse" />
        }
      >
        <SignupForm />
      </Suspense>
    </main>
  );
}
