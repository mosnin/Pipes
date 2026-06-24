"use client";

import Link from "next/link";
import { ArrowRight, KeyRound } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { ProtocolSseStreamDemo } from "./ProtocolSseStreamDemo";

/**
 * ProtocolHero
 *
 * Locked headline + one-line value prop + two CTAs on the left.
 * Live SSE stream demo on the right. Surface-subtle rounded panel.
 */
export interface ProtocolHeroProps {
  className?: string;
}

export function ProtocolHero({ className }: ProtocolHeroProps) {
  const reduced = useReducedMotion();
  return (
    <section
      className={["px-4 sm:px-6", className ?? ""].join(" ")}
      aria-label="Protocol hero"
      data-testid="protocol-hero"
    >
      <div className="mx-auto max-w-7xl">
        <div
          className="relative overflow-hidden surface-subtle"
          style={{ borderRadius: 40 }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 brand-pattern-bg opacity-60 pointer-events-none"
          />
          <div className="relative grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 px-6 sm:px-12 py-20 sm:py-28">
            <div className="flex flex-col justify-center">
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white px-3 py-1 t-caption font-semibold text-violet-700">
                  <KeyRound size={12} aria-hidden="true" />
                  Protocol reference
                </div>
                <h1
                  className="mt-5 text-[#111]"
                  style={{
                    fontSize: "clamp(40px, 5.4vw, 64px)",
                    lineHeight: 1.04,
                    letterSpacing: "-0.035em",
                    fontWeight: 700,
                  }}
                >
                  One token. Read your map.
                </h1>
                <p
                  className="mt-5 t-body text-[#3C3C43] max-w-[44ch]"
                  style={{ fontSize: 17, lineHeight: 1.55 }}
                >
                  Looper speaks MCP. Hand any agent a Bearer token and it sees your system the way your team does.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    href="/docs#protocol"
                    className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-5 h-11 t-label font-semibold text-white hover:bg-violet-700 transition-colors"
                  >
                    View docs
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                  <Link
                    href="/settings/tokens"
                    className="inline-flex items-center gap-1.5 rounded-md border border-black/[0.14] bg-white px-5 h-11 t-label font-semibold text-[#111] hover:border-black/[0.24] hover:bg-black/[0.02] transition-colors"
                  >
                    Get a token
                  </Link>
                </div>
                <dl className="mt-9 grid grid-cols-3 gap-6 max-w-md">
                  <div>
                    <dt className="t-overline text-[#8E8E93]">Transport</dt>
                    <dd className="mt-1 t-label font-semibold text-[#111]">SSE + JSON</dd>
                  </div>
                  <div>
                    <dt className="t-overline text-[#8E8E93]">Auth</dt>
                    <dd className="mt-1 t-label font-semibold text-[#111]">Bearer ptk_</dd>
                  </div>
                  <div>
                    <dt className="t-overline text-[#8E8E93]">Calls/min</dt>
                    <dd className="mt-1 t-label font-semibold text-[#111]">120</dd>
                  </div>
                </dl>
              </motion.div>
            </div>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
              className="flex items-center"
            >
              <ProtocolSseStreamDemo className="w-full" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
