"use client";

import { Share2 } from "lucide-react";

// MobileTopBar — slim 48px header for the mobile system view. Shows the
// workspace name on the left, the system name centered, and a share button on
// the right. The share button is functional even on platforms without the
// Web Share API: it falls back to copy-to-clipboard via the parent.

export type MobileTopBarProps = {
  workspaceName?: string;
  systemName: string;
  onShare: () => void;
};

export function MobileTopBar({ workspaceName, systemName, onShare }: MobileTopBarProps): React.ReactElement {
  return (
    <header
      className="flex items-center gap-3 px-3 bg-white/95 backdrop-blur border-b border-black/[0.06] z-30"
      style={{ height: 48, paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="min-w-0 flex-1 flex items-center gap-2">
        {workspaceName ? (
          <span className="t-caption text-[#8E8E93] truncate max-w-[40%]">{workspaceName}</span>
        ) : null}
        {workspaceName ? <span aria-hidden className="text-[#C7C7CC]">/</span> : null}
        <span className="t-label font-semibold text-[#111] truncate">{systemName}</span>
      </div>
      <button
        type="button"
        onClick={onShare}
        aria-label="Share system"
        className="inline-flex items-center justify-center w-11 h-11 -mr-1 rounded-full text-[#3C3C43] hover:bg-black/[0.05] active:bg-black/[0.08] transition-colors"
      >
        <Share2 size={18} />
      </button>
    </header>
  );
}
