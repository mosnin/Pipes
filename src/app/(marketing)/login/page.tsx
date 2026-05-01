import Link from "next/link";
import { GitBranch, ShieldCheck } from "lucide-react";
import { CardShell, CardBody, CardFooter, CardHeader } from "@/components/ui";

export const metadata = {
  title: "Sign in - Pipes",
  description: "Sign in to your Pipes workspace.",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen surface-subtle flex items-center justify-center px-4 py-12">
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

        {/* Card */}
        <CardShell className="shadow-sm-token">
          <CardHeader className="text-center">
            <h1 className="t-h3 text-[#111]">Welcome back</h1>
            <p className="mt-1 t-label text-[#8E8E93]">
              Continue to your Pipes workspace
            </p>
          </CardHeader>

          <CardBody>
            <form
              action="/api/auth/login"
              method="GET"
              className="flex flex-col gap-3.5"
            >
              <input type="hidden" name="returnTo" value="/dashboard" />

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="t-label font-medium text-[#111]">
                  Work email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="alex@acme.com"
                  className="w-full h-10 rounded-lg border border-black/[0.08] bg-white px-3 t-label text-[#111] placeholder:text-[#C7C7CC] focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-shadow"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="t-label font-medium text-[#111]"
                  >
                    Password
                  </label>
                  <Link
                    href="/api/auth/login?screen_hint=forgot_password"
                    className="t-caption text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full h-10 rounded-lg border border-black/[0.08] bg-white px-3 t-label text-[#111] placeholder:text-[#C7C7CC] focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-shadow"
                />
              </div>

              <button
                type="submit"
                className="mt-1 w-full h-10 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-700 text-white font-semibold rounded-lg t-label transition-colors"
              >
                Continue
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <span className="h-px flex-1 bg-black/[0.06]" />
              <span className="t-caption text-[#8E8E93]">OR</span>
              <span className="h-px flex-1 bg-black/[0.06]" />
            </div>

            <a
              href="/api/auth/login?returnTo=/dashboard&connection=google-oauth2"
              className="flex w-full items-center justify-center gap-2.5 h-10 bg-white border border-black/[0.14] hover:border-black/[0.24] active:border-black/[0.24] text-[#111] font-medium rounded-lg t-label transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M21.98 12.22c0-.68-.06-1.33-.17-1.96H12v3.71h5.6a4.79 4.79 0 0 1-2.08 3.14v2.61h3.37c1.97-1.82 3.09-4.5 3.09-7.5Z" />
                <path d="M12 22c2.8 0 5.15-.93 6.87-2.52l-3.37-2.61c-.93.62-2.12.99-3.5.99-2.69 0-4.97-1.82-5.78-4.26H2.74v2.69A10 10 0 0 0 12 22Z" />
                <path d="M6.22 13.6A6.01 6.01 0 0 1 5.9 12c0-.56.1-1.1.32-1.6V7.71H2.74A10 10 0 0 0 2 12c0 1.61.39 3.14 1.08 4.5l3.14-2.9Z" />
                <path d="M12 5.75c1.52 0 2.88.52 3.95 1.55l2.96-2.96A9.97 9.97 0 0 0 12 2 10 10 0 0 0 2.74 7.71l3.48 2.69C7.03 7.57 9.31 5.75 12 5.75Z" />
              </svg>
              Continue with Google
            </a>
          </CardBody>

          <CardFooter className="!justify-center">
            <p className="t-caption text-[#8E8E93]">
              No account yet?{" "}
              <Link
                href="/signup"
                className="text-indigo-600 font-medium hover:text-indigo-700 transition-colors"
              >
                Create a workspace
              </Link>
            </p>
          </CardFooter>
        </CardShell>

        <p className="mt-5 text-center t-caption text-[#C7C7CC] flex items-center justify-center gap-1.5">
          <ShieldCheck size={12} aria-hidden="true" />
          Secured by Auth0 - your credentials are never stored by Pipes
        </p>
      </div>
    </main>
  );
}
