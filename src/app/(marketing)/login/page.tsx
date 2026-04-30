import Link from "next/link";
import { GitBranch, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Pipes · Sign in",
  description: "Sign in to your Pipes workspace.",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6">
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

          <div className="space-y-1.5 text-center">
            <h1 className="text-[22px] font-bold text-[#111]" style={{ letterSpacing: "-0.02em" }}>
              Welcome back
            </h1>
            <p className="t-label text-[#8E8E93]">Continue to your workspace</p>
          </div>

          <div className="h-px bg-black/[0.06]" />

          <a
            href="/api/auth/login?returnTo=/dashboard"
            className="flex w-full items-center justify-center gap-2.5 h-11 bg-[#111] hover:bg-[#222] active:bg-black text-white font-semibold rounded-xl transition-colors t-label"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M21.98 12.22c0-.68-.06-1.33-.17-1.96H12v3.71h5.6a4.79 4.79 0 0 1-2.08 3.14v2.61h3.37c1.97-1.82 3.09-4.5 3.09-7.5Z" />
              <path d="M12 22c2.8 0 5.15-.93 6.87-2.52l-3.37-2.61c-.93.62-2.12.99-3.5.99-2.69 0-4.97-1.82-5.78-4.26H2.74v2.69A10 10 0 0 0 12 22Z" />
              <path d="M6.22 13.6A6.01 6.01 0 0 1 5.9 12c0-.56.1-1.1.32-1.6V7.71H2.74A10 10 0 0 0 2 12c0 1.61.39 3.14 1.08 4.5l3.14-2.9Z" />
              <path d="M12 5.75c1.52 0 2.88.52 3.95 1.55l2.96-2.96A9.97 9.97 0 0 0 12 2 10 10 0 0 0 2.74 7.71l3.48 2.69C7.03 7.57 9.31 5.75 12 5.75Z" />
            </svg>
            Continue with Google
          </a>

          <p className="text-center t-caption text-[#8E8E93]">
            No account yet?{" "}
            <Link
              href="/signup"
              className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
            >
              Sign up free
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center t-caption text-[#C7C7CC] flex items-center justify-center gap-1.5">
          <ShieldCheck size={12} aria-hidden="true" />
          Secured by Auth0 &mdash; your credentials are never stored by Pipes
        </p>
      </div>
    </main>
  );
}
