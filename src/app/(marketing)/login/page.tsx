import Link from "next/link";
import { Card, Separator } from "@heroui/react";
import { GitBranch, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white"
      >
        <Card.Content className="flex flex-col items-center gap-6 px-8 py-10">
          {/* Logo */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-indigo-600">
              <GitBranch size={28} strokeWidth={2} />
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                Pipes
              </span>
            </div>
          </div>

          {/* Heading */}
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
            <p className="text-sm text-slate-500">Continue to your workspace</p>
          </div>

          <Separator className="w-full" />

          {/* Auth button */}
          <a
            href="/api/auth/login?returnTo=/dashboard"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 text-white font-semibold py-3 px-4 hover:bg-slate-700 transition-colors text-base"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M21.98 12.22c0-.68-.06-1.33-.17-1.96H12v3.71h5.6a4.79 4.79 0 0 1-2.08 3.14v2.61h3.37c1.97-1.82 3.09-4.5 3.09-7.5Z" />
              <path d="M12 22c2.8 0 5.15-.93 6.87-2.52l-3.37-2.61c-.93.62-2.12.99-3.5.99-2.69 0-4.97-1.82-5.78-4.26H2.74v2.69A10 10 0 0 0 12 22Z" />
              <path d="M6.22 13.6A6.01 6.01 0 0 1 5.9 12c0-.56.1-1.1.32-1.6V7.71H2.74A10 10 0 0 0 2 12c0 1.61.39 3.14 1.08 4.5l3.14-2.9Z" />
              <path d="M12 5.75c1.52 0 2.88.52 3.95 1.55l2.96-2.96A9.97 9.97 0 0 0 12 2 10 10 0 0 0 2.74 7.71l3.48 2.69C7.03 7.57 9.31 5.75 12 5.75Z" />
            </svg>
            Continue with Auth0
          </a>

          {/* Sign up link */}
          <p className="text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              Sign up
            </Link>
          </p>

          <Separator className="w-full" />

          {/* Security note */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={14} />
            <span>
              Secured by Auth0. Your credentials are never stored by Pipes.
            </span>
          </div>
        </Card.Content>
      </Card>
    </main>
  );
}
