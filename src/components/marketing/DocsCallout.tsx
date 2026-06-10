"use client";

import type { ReactNode } from "react";

/**
 * DocsCallout
 *
 * An info / warning / tip box rendered with a small SVG glyph. No lucide here
 * (per spec); the glyph is a 14px stroke icon defined inline.
 */

export type CalloutTone = "info" | "warning" | "tip";

export interface DocsCalloutProps {
  tone?: CalloutTone;
  title?: string;
  children: ReactNode;
}

const TONE_STYLES: Record<
  CalloutTone,
  { bg: string; border: string; iconFg: string; titleFg: string; bodyFg: string }
> = {
  info: {
    bg: "bg-[#EFF6FF]",
    border: "border-[#BFDBFE]",
    iconFg: "text-[#2563EB]",
    titleFg: "text-[#1E40AF]",
    bodyFg: "text-[#1E3A8A]",
  },
  warning: {
    bg: "bg-[#FFFBEB]",
    border: "border-[#FCD34D]",
    iconFg: "text-[#D97706]",
    titleFg: "text-[#92400E]",
    bodyFg: "text-[#78350F]",
  },
  tip: {
    bg: "bg-[#ECFDF5]",
    border: "border-[#A7F3D0]",
    iconFg: "text-[#059669]",
    titleFg: "text-[#065F46]",
    bodyFg: "text-[#064E3B]",
  },
};

function Glyph({ tone }: { tone: CalloutTone }) {
  const cls = `${TONE_STYLES[tone].iconFg} shrink-0 mt-0.5`;
  if (tone === "info") {
    return (
      <svg
        viewBox="0 0 16 16"
        width={14}
        height={14}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cls}
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6.5" />
        <line x1="8" y1="7.25" x2="8" y2="11" />
        <circle cx="8" cy="5" r="0.75" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (tone === "warning") {
    return (
      <svg
        viewBox="0 0 16 16"
        width={14}
        height={14}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cls}
        aria-hidden="true"
      >
        <path d="M8 1.75 L14.75 13.5 L1.25 13.5 Z" />
        <line x1="8" y1="6" x2="8" y2="9.5" />
        <circle cx="8" cy="11.5" r="0.75" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  // tip
  return (
    <svg
      viewBox="0 0 16 16"
      width={14}
      height={14}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cls}
      aria-hidden="true"
    >
      <path d="M5.5 11.25 V13 a1 1 0 0 0 1 1 h3 a1 1 0 0 0 1 -1 v-1.75" />
      <path d="M4 7.5 a4 4 0 1 1 8 0 c0 1.6 -1 2.5 -1.5 3.5 H5.5 c-0.5 -1 -1.5 -1.9 -1.5 -3.5 Z" />
    </svg>
  );
}

const TONE_LABEL: Record<CalloutTone, string> = {
  info: "Note",
  warning: "Warning",
  tip: "Tip",
};

export function DocsCallout({
  tone = "info",
  title,
  children,
}: DocsCalloutProps) {
  const s = TONE_STYLES[tone];
  return (
    <div
      role="note"
      aria-label={title ?? TONE_LABEL[tone]}
      className={`my-5 rounded-2xl border ${s.border} ${s.bg} px-4 py-3 flex gap-3`}
    >
      <Glyph tone={tone} />
      <div className="flex-1 min-w-0">
        <p className={`t-label font-semibold ${s.titleFg} mb-0.5`}>
          {title ?? TONE_LABEL[tone]}
        </p>
        <div className={`t-label ${s.bodyFg} leading-relaxed`}>{children}</div>
      </div>
    </div>
  );
}
