"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * NewsletterSignup
 *
 * Single email input + Subscribe button. POSTs to /api/newsletter (a
 * placeholder route that returns 200). The voice is locked: no spam-shame,
 * no urgency. About one email a month.
 *
 * Two visual styles:
 *  - "inline" — compact strip inside an article footer.
 *  - "panel" — large rounded-[40px] surface for the index CTA strip.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface NewsletterSignupProps {
  variant?: "inline" | "panel";
  className?: string;
}

export function NewsletterSignup({
  variant = "panel",
  className,
}: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const looksValid = EMAIL_RE.test(email.trim());
  const showInvalid = touched && email.length > 0 && !looksValid;

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setTouched(true);
    if (!looksValid) {
      toast.error("Enter a valid email.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        toast.error("That did not go through. Try again in a moment.");
        return;
      }
      toast.success("Subscribed. We will be in touch.");
      setEmail("");
      setTouched(false);
    } catch {
      toast.error("That did not go through. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  if (variant === "inline") {
    return (
      <form
        onSubmit={onSubmit}
        className={cn(
          "flex flex-col sm:flex-row items-stretch gap-2 w-full",
          className,
        )}
        aria-label="Subscribe to the Pipes newsletter"
      >
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={showInvalid}
          aria-label="Email address"
          className={cn(
            "flex-1 h-10 rounded-lg border bg-white px-3 t-label text-[#111] placeholder:text-[#8E8E93] outline-none",
            "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100",
            showInvalid ? "border-[#FCA5A5]" : "border-black/[0.08]",
          )}
        />
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-indigo-600 text-white t-label font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? <Spinner size="xs" /> : null}
          <span>{submitting ? "Subscribing" : "Subscribe"}</span>
          {!submitting ? <ArrowRight size={14} aria-hidden="true" /> : null}
        </button>
      </form>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[40px] bg-indigo-50 border border-indigo-100 px-6 py-10 sm:px-12 sm:py-14",
        className,
      )}
      data-testid="newsletter-signup"
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-5 text-center">
        <h2 className="t-h1 text-[#111]">Subscribe to the Pipes notes.</h2>
        <p className="t-body text-[#3C3C43]">
          Get an email when we ship something interesting. About one a month.
        </p>
        <form
          onSubmit={onSubmit}
          className="flex flex-col sm:flex-row items-stretch gap-2 w-full max-w-md mx-auto"
          aria-label="Subscribe to the Pipes newsletter"
        >
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={showInvalid}
            aria-label="Email address"
            className={cn(
              "flex-1 h-11 rounded-lg border bg-white px-4 t-body text-[#111] placeholder:text-[#8E8E93] outline-none",
              "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100",
              showInvalid ? "border-[#FCA5A5]" : "border-black/[0.08]",
            )}
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-lg bg-indigo-600 text-white t-label font-semibold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? <Spinner size="xs" /> : null}
            <span>{submitting ? "Subscribing" : "Subscribe"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
