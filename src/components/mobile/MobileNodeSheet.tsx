"use client";

import { useEffect, useRef, type TouchEvent as ReactTouchEvent } from "react";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import type { GraphNode } from "@/components/editor/editor_state";

// MobileNodeSheet — bottom sheet that slides up when a node is tapped on the
// mobile canvas. Half-screen height, drag down to dismiss, tap a connection
// row to jump to the related node.

const DISMISS_DRAG_PX = 80;

export type ConnectionRow = {
  nodeId: string;
  title: string;
};

export type MobileNodeSheetProps = {
  open: boolean;
  node: GraphNode | null;
  outbound: ConnectionRow[];
  inbound: ConnectionRow[];
  onClose: () => void;
  onConnectionTap: (nodeId: string) => void;
};

export function MobileNodeSheet({
  open,
  node,
  outbound,
  inbound,
  onClose,
  onConnectionTap,
}: MobileNodeSheetProps): React.ReactElement | null {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<number | null>(null);
  const dragOffsetRef = useRef<number>(0);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset any drag offset when the sheet opens.
  useEffect(() => {
    if (open && sheetRef.current) {
      sheetRef.current.style.transform = "translateY(0)";
    }
  }, [open]);

  const onHandleTouchStart = (event: ReactTouchEvent<HTMLDivElement>): void => {
    if (event.touches.length !== 1) return;
    dragStartRef.current = event.touches[0].clientY;
    dragOffsetRef.current = 0;
  };

  const onHandleTouchMove = (event: ReactTouchEvent<HTMLDivElement>): void => {
    if (dragStartRef.current === null) return;
    const delta = event.touches[0].clientY - dragStartRef.current;
    if (delta < 0) {
      dragOffsetRef.current = 0;
      if (sheetRef.current) sheetRef.current.style.transform = "translateY(0)";
      return;
    }
    dragOffsetRef.current = delta;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  };

  const onHandleTouchEnd = (): void => {
    if (dragStartRef.current === null) return;
    const settled = dragOffsetRef.current;
    dragStartRef.current = null;
    dragOffsetRef.current = 0;
    if (sheetRef.current) sheetRef.current.style.transform = "translateY(0)";
    if (settled > DISMISS_DRAG_PX) onClose();
  };

  if (!open || !node) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Node detail: ${node.title}`}
      data-testid="mobile-node-sheet"
      className="fixed inset-0 z-40"
    >
      {/* Scrim. Tapping outside the sheet closes it. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 transition-opacity"
      />
      <div
        ref={sheetRef}
        className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-xl flex flex-col"
        style={{
          maxHeight: "60vh",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
          transition: "transform 180ms ease-out",
        }}
      >
        {/* Drag handle */}
        <div
          onTouchStart={onHandleTouchStart}
          onTouchMove={onHandleTouchMove}
          onTouchEnd={onHandleTouchEnd}
          className="flex items-center justify-center py-2 cursor-grab"
          aria-hidden="true"
        >
          <div className="w-10 h-1.5 rounded-full bg-black/15" />
        </div>

        <div className="flex items-start justify-between gap-3 px-4 pb-2">
          <div className="min-w-0 flex-1">
            <h2 className="t-h3 text-[#111] leading-tight truncate">{node.title}</h2>
            <p className="t-caption text-[#8E8E93] uppercase tracking-wide mt-0.5">{node.type}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail"
            className="inline-flex items-center justify-center w-11 h-11 -mr-2 rounded-full text-[#3C3C43] hover:bg-black/[0.05] active:bg-black/[0.08] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pb-4 overflow-y-auto">
          {node.description ? (
            <p className="t-body text-[#3C3C43] leading-snug mt-1">{node.description}</p>
          ) : (
            <p className="t-body text-[#8E8E93] leading-snug mt-1">No description.</p>
          )}

          {outbound.length > 0 ? (
            <section className="mt-5">
              <h3 className="t-overline text-[#8E8E93]">Connects to</h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {outbound.map((row) => (
                  <li key={`out-${row.nodeId}`}>
                    <button
                      type="button"
                      onClick={() => onConnectionTap(row.nodeId)}
                      className="w-full flex items-center justify-between gap-2 min-h-[44px] px-3 py-2 bg-[#F5F5F7] hover:bg-[#EBEBF0] active:bg-[#E1E1E6] rounded-lg t-label text-[#111] text-left transition-colors"
                    >
                      <span className="truncate">{row.title}</span>
                      <ArrowRight size={14} className="shrink-0 text-[#3C3C43]" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {inbound.length > 0 ? (
            <section className="mt-5">
              <h3 className="t-overline text-[#8E8E93]">Receives from</h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {inbound.map((row) => (
                  <li key={`in-${row.nodeId}`}>
                    <button
                      type="button"
                      onClick={() => onConnectionTap(row.nodeId)}
                      className="w-full flex items-center justify-between gap-2 min-h-[44px] px-3 py-2 bg-[#F5F5F7] hover:bg-[#EBEBF0] active:bg-[#E1E1E6] rounded-lg t-label text-[#111] text-left transition-colors"
                    >
                      <span className="truncate">{row.title}</span>
                      <ArrowLeft size={14} className="shrink-0 text-[#3C3C43]" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {outbound.length === 0 && inbound.length === 0 ? (
            <p className="t-caption text-[#8E8E93] mt-5">No connections yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
