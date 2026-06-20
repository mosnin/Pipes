"use client";

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui";
import { EmptyCanvas, EmptyTemplates } from "@/components/illustrations";
import {
  getMentalModelSeen,
  setMentalModelSeen,
} from "@/lib/feedback/storage";

// ---------------------------------------------------------------------------
// MentalModelCard
//
// Fires once per browser on the first dashboard visit. Three short screens
// teaching the two primitives (node, connection) and the one workflow
// (describe, the agent draws). Dismissing via close, escape, click outside,
// the "Skip" link, or completing all three screens persists the seen flag.
// The card never re-renders after the flag is set.
// ---------------------------------------------------------------------------

type ScreenContent = {
  illustration: ReactElement;
  headline: string;
  body: string;
};

const SCREENS: ScreenContent[] = [
  {
    illustration: <EmptyCanvas size={120} />,
    headline: "A node is one step in your system.",
    body: "It could be an agent, a tool, a guard step, anything that does one job. Looper does not care what kind. You name it. You describe what it does. The agent reads the name and the description and works out the rest.",
  },
  {
    illustration: <EmptyCanvas size={120} />,
    headline: "A connection is the flow between two steps.",
    body: "When you connect one node to another you say: when this finishes, that runs. Looper does not care if it is data, an event, or a control signal. You decide. The agent reads the shape of the flow.",
  },
  {
    illustration: <EmptyTemplates size={120} />,
    headline: "Describe it. The agent draws it.",
    body: "You do not draw the boxes. You type one sentence. The agent plans, then builds. You watch the canvas come alive. You correct. You ship.",
  },
];

export function MentalModelCard(): ReactElement | null {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Mount-only check. SSR-safe: server returns null, client opens iff unseen.
  useEffect(() => {
    setMounted(true);
    if (!getMentalModelSeen()) {
      setOpen(true);
    }
  }, []);

  const dismiss = (): void => {
    setMentalModelSeen();
    setOpen(false);
  };

  const next = (): void => {
    if (step >= SCREENS.length - 1) {
      dismiss();
      return;
    }
    setStep((s) => Math.min(s + 1, SCREENS.length - 1));
  };

  const back = (): void => {
    setStep((s) => Math.max(s - 1, 0));
  };

  // Esc key handler. Click-outside is handled in the backdrop onClick below.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        dismiss();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!mounted || !open) return null;

  const screen = SCREENS[step];
  const isLast = step === SCREENS.length - 1;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={dismiss}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mental-model-headline"
        className="relative w-full bg-white rounded-[16px] shadow-xl-token flex flex-col overflow-hidden"
        style={{ maxWidth: 560 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close X */}
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 rounded-md text-[#8E8E93] hover:text-[#111] hover:bg-[#F5F5F7] transition-colors"
        >
          <X size={16} />
        </button>

        {/* Body */}
        <div className="px-6 pt-10 pb-4 flex flex-col items-center text-center gap-4">
          <div className="text-[#3C3C43]" aria-hidden="true">
            {screen.illustration}
          </div>
          <h2
            id="mental-model-headline"
            className="t-h3 font-semibold text-[#111]"
          >
            {screen.headline}
          </h2>
          <p className="t-body text-[#3C3C43] max-w-[420px]">
            {screen.body}
          </p>
        </div>

        {/* Pagination dots */}
        <div
          className="flex items-center justify-center gap-2 pb-4"
          role="tablist"
          aria-label="Mental model screens"
        >
          {SCREENS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              role="tab"
              aria-selected={idx === step}
              aria-label={`Screen ${idx + 1}`}
              onClick={() => setStep(idx)}
              className={
                idx === step
                  ? "w-2 h-2 rounded-full bg-[#4F46E5] transition-colors"
                  : "w-2 h-2 rounded-full bg-[#C7C7CC] hover:bg-[#8E8E93] transition-colors"
              }
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--color-line)] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="t-label text-[#8E8E93] hover:text-[#111] transition-colors"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onPress={back}>
                Back
              </Button>
            )}
            <Button variant="primary" size="sm" onPress={next}>
              {isLast ? "Got it" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
