"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * CompareSwitchStrip
 *
 * Two side-by-side panels: when to choose Looper vs when to choose the
 * other product. Three short bullets each. Honest, not hype.
 *
 * Sits inside a rounded-[40px] inverse surface for visual contrast.
 */

export interface CompareSwitchStripProps {
  competitor: string;
  choosePipes: ReadonlyArray<string>;
  chooseOther: ReadonlyArray<string>;
}

export function CompareSwitchStrip({
  competitor,
  choosePipes,
  chooseOther,
}: CompareSwitchStripProps) {
  const reduced = useReducedMotion();

  return (
    <section className="px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="relative overflow-hidden rounded-[40px] bg-[#0A0A0A] text-white px-6 py-14 sm:px-12 sm:py-20"
          initial={reduced ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="mb-10 flex flex-col gap-2 max-w-2xl">
            <span className="t-overline text-white/60">When to choose what</span>
            <h2 className="t-h2 text-white">
              No tool wins every job. Here is honest.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Panel
              eyebrow="Choose Looper when"
              title="The system has to be read back"
              bullets={choosePipes}
              accent
            />
            <Panel
              eyebrow={`Choose ${competitor} when`}
              title="The job is a picture, not a system"
              bullets={chooseOther}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Panel({
  eyebrow,
  title,
  bullets,
  accent = false,
}: {
  eyebrow: string;
  title: string;
  bullets: ReadonlyArray<string>;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-3xl p-6 sm:p-8 flex flex-col gap-4",
        accent
          ? "bg-white text-[#111] border border-white/10"
          : "bg-white/[0.04] text-white border border-white/[0.08]",
      ].join(" ")}
    >
      <div className="flex flex-col gap-1.5">
        <span
          className={[
            "t-overline",
            accent ? "text-[#8E8E93]" : "text-white/50",
          ].join(" ")}
        >
          {eyebrow}
        </span>
        <h3
          className={[
            "t-h3",
            accent ? "text-[#111]" : "text-white",
          ].join(" ")}
        >
          {title}
        </h3>
      </div>
      <ul className="flex flex-col gap-3">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className={[
                "mt-1.5 h-1.5 w-1.5 rounded-full shrink-0",
                accent ? "bg-violet-600" : "bg-white/50",
              ].join(" ")}
            />
            <span
              className={[
                "t-label leading-relaxed",
                accent ? "text-[#3C3C43]" : "text-white/80",
              ].join(" ")}
            >
              {b}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
