"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { Monitor, Share2 } from "lucide-react";

// MobileActionBar — sticky bottom bar with two actions. Primary: copy the
// current URL with a toast hinting at desktop. Secondary: native share when
// available, otherwise the same copy-to-clipboard.

export type MobileActionBarProps = {
  shareUrl?: string;
  shareTitle?: string;
  onOpenOnDesktop?: () => void;
};

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function MobileActionBar({ shareUrl, shareTitle, onOpenOnDesktop }: MobileActionBarProps): React.ReactElement {
  const handleOpenOnDesktop = useCallback(async () => {
    const url = shareUrl ?? (typeof window !== "undefined" ? window.location.href : "");
    if (!url) return;
    const ok = await copyText(url);
    if (ok) {
      toast.success("Link copied. Open it on your laptop.");
    } else {
      toast.error("Could not copy link.");
    }
    if (onOpenOnDesktop) onOpenOnDesktop();
  }, [shareUrl, onOpenOnDesktop]);

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = shareUrl ?? window.location.href;
    const title = shareTitle ?? document.title;
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title, url });
        return;
      } catch {
        // User canceled or share failed — fall through to clipboard.
      }
    }
    const ok = await copyText(url);
    if (ok) toast.success("Link copied.");
    else toast.error("Could not copy link.");
  }, [shareUrl, shareTitle]);

  return (
    <div
      className="sticky bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-black/[0.06] z-30"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2" style={{ minHeight: 56 }}>
        <button
          type="button"
          onClick={handleOpenOnDesktop}
          className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white t-label font-medium rounded-xl px-3 transition-colors"
        >
          <Monitor size={16} />
          Open on desktop
        </button>
        <button
          type="button"
          onClick={handleShare}
          aria-label="Share"
          className="inline-flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] bg-white hover:bg-black/[0.04] active:bg-black/[0.06] text-[#111] border border-black/[0.08] t-label font-medium rounded-xl px-4 transition-colors"
        >
          <Share2 size={16} />
          Share
        </button>
      </div>
    </div>
  );
}
