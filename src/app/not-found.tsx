"use client";

import Link from "next/link";
import { NotFound404 } from "@/components/illustrations";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 surface-subtle">
      <div className="w-full max-w-md bg-white border border-black/[0.08] rounded-[16px] shadow-md-token p-8 flex flex-col items-center text-center gap-4">
        <NotFound404 size={120} className="text-[#C7C7CC]" />
        <h1 className="t-h2 text-[#111]">Page not found</h1>
        <p className="t-body text-[#3C3C43] max-w-sm">
          We could not find that page. Try the dashboard.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white t-label font-semibold transition-colors shadow-xs"
          >
            Back to dashboard
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-white hover:bg-black/[0.04] border border-black/[0.08] text-[#111] t-label font-semibold transition-colors"
          >
            Go to docs
          </Link>
        </div>
      </div>
    </div>
  );
}
