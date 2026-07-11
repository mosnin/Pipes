"use client";

import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Wordmark } from "@/components/Wordmark";
import { Spinner } from "@/components/ui";

// Shell for one onboarding step. Renders:
//   - the four-dot progress indicator (top)
//   - the step content (center)
//   - back / continue controls (bottom)
//
// The dots are clickable backward; forward navigation is locked behind the
// continueDisabled prop set by the step itself.

export type OnboardingStep = 1 | 2 | 3;
export const TOTAL_STEPS = 3 as const;

export type OnboardingStepShellProps = {
  step: OnboardingStep;
  title: string;
  subtitle: string;
  direction?: 1 | -1;
  onBack?: () => void;
  onContinue?: () => void;
  onJumpTo?: (step: OnboardingStep) => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  hideControls?: boolean;
  children: ReactNode;
};

export function OnboardingStepShell({
  step,
  title,
  subtitle,
  direction = 1,
  onBack,
  onContinue,
  onJumpTo,
  continueLabel = "Continue",
  continueDisabled = false,
  continueLoading = false,
  hideControls = false,
  children,
}: OnboardingStepShellProps) {
  const xOut = direction * -36;
  const xIn = direction * 36;
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(79,70,229,0.06) 0%, transparent 70%)",
      }}
    >
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Wordmark size="md" />
        <ProgressDots step={step} onJumpTo={onJumpTo} />
        <span className="t-caption text-[#8E8E93]" aria-hidden="true">
          Step {step} of {TOTAL_STEPS}
        </span>
      </header>

      <motion.section
        key={step}
        initial={{ opacity: 0, x: xIn }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: xOut }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 flex flex-col items-center justify-center px-6 py-12"
        aria-labelledby="onboarding-title"
      >
        <div className="w-full max-w-2xl">
          <h1
            id="onboarding-title"
            className="text-[#111]"
            style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.12,
            }}
          >
            {title}
          </h1>
          <p
            className="mt-4 text-[#3C3C43]"
            style={{ fontSize: 17, lineHeight: 1.55 }}
          >
            {subtitle}
          </p>

          <div className="mt-10">{children}</div>

          {!hideControls && (
            <div className="mt-10 flex items-center justify-between">
              <button
                type="button"
                onClick={onBack}
                disabled={onBack == null}
                className="
                  inline-flex items-center gap-1.5 t-label font-medium
                  text-[#3C3C43] hover:text-[#111] disabled:opacity-40
                  transition-colors
                "
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Back
              </button>

              <button
                type="button"
                onClick={onContinue}
                disabled={continueDisabled || continueLoading}
                className="
                  inline-flex items-center gap-2 h-11 px-6
                  rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800
                  text-white font-semibold t-label transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-sm hover:shadow-md
                "
                style={{ letterSpacing: "-0.01em" }}
              >
                {continueLoading && <Spinner size="sm" />}
                {continueLabel}
                {!continueLoading && <ArrowRight size={14} aria-hidden="true" />}
              </button>
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
}

// ---------------------------------------------------------------------------

type ProgressDotsProps = {
  step: OnboardingStep;
  onJumpTo?: (step: OnboardingStep) => void;
};

function ProgressDots({ step, onJumpTo }: ProgressDotsProps) {
  const dots: OnboardingStep[] = [1, 2, 3];
  return (
    <div
      role="tablist"
      aria-label="Onboarding progress"
      className="flex items-center gap-2"
    >
      {dots.map((d) => {
        const active = d === step;
        const visited = d < step;
        const interactive = onJumpTo != null && d < step;
        const Tag: "button" | "span" = interactive ? "button" : "span";
        return (
          <Tag
            key={d}
            role="tab"
            aria-selected={active}
            aria-label={`Step ${d}`}
            onClick={interactive ? () => onJumpTo?.(d) : undefined}
            className={
              interactive
                ? "cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                : "rounded-full"
            }
            type={interactive ? "button" : undefined}
          >
            <span
              aria-hidden="true"
              className={[
                "block rounded-full transition-all duration-200",
                active
                  ? "w-6 h-1.5 bg-[#111]"
                  : visited
                    ? "w-1.5 h-1.5 bg-[#111]/60"
                    : "w-1.5 h-1.5 bg-[#C7C7CC]",
              ].join(" ")}
            />
          </Tag>
        );
      })}
    </div>
  );
}
