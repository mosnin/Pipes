"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 surface-subtle">
      <div className="w-full max-w-md bg-white border border-black/[0.08] rounded-[16px] shadow-md-token p-8 flex flex-col items-center text-center gap-3">
        <span className="t-overline text-[#8E8E93]">Error 404</span>
        <h1 className="t-display text-[#111]">404</h1>
        <h2 className="t-h3 text-[#111]">Page not found</h2>
        <p className="t-body text-[#3C3C43] max-w-sm">
          The page you are looking for does not exist or has been moved. Check the
          URL or return to your workspace.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white t-label font-semibold transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to dashboard
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-white hover:bg-black/[0.04] border border-black/[0.08] text-[#111] t-label font-semibold transition-colors"
          >
            <BookOpen className="h-4 w-4" aria-hidden />
            Go to docs
          </Link>
        </div>
      </div>
    </div>
  );
}
