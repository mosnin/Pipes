"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

// Dismissible banner that names the desktop-first decision out loud. Subtle,
// not blocking: the user can keep using whatever mobile-compatible flows the
// app still supports (marketing, sign-in, dashboard browse, read-only system
// view). The dismissal persists in localStorage so returning visitors are not
// scolded twice.

const STORAGE_KEY = "pipes-mobile-warning-dismissed";

export function DesktopFirstBanner() {
  // Default to false so SSR and first paint render nothing. The effect below
  // hydrates from localStorage and decides whether to show the banner.
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed !== "1") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = (): void => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label="Desktop recommendation"
      className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2.5 text-[#111]"
    >
      <div className="flex-1 min-w-0">
        <p className="t-label font-semibold text-[#111] leading-tight">
          Pipes is built for desktop.
        </p>
        <p className="t-caption text-[#3C3C43] leading-snug mt-0.5">
          Read and share here. Editing feels right with a keyboard.
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-md text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
