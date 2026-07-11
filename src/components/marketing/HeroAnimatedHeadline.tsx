"use client";

import { motion } from "framer-motion";

// The headline IS the magic moment: you describe the loop, it builds itself.
// The second sentence is set apart on its own line for rhythm.
const lines = [
  ["Describe", "the", "loop."],
  ["It", "builds", "itself."],
];

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.15,
    },
  },
};

const word = {
  hidden: { opacity: 0, y: 28, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function HeroAnimatedHeadline() {
  return (
    <motion.h1
      variants={container}
      initial="hidden"
      animate="show"
      className="mt-6 text-[#111]"
      style={{
        fontSize: "clamp(44px, 7vw, 84px)",
        lineHeight: 1.02,
        letterSpacing: "-0.045em",
        fontWeight: 700,
      }}
      aria-label="Describe the loop. It builds itself."
    >
      {lines.map((line, i) => (
        <span key={i} className="flex flex-wrap" style={{ gap: "0 0.22em" }}>
          {line.map((w) => (
            <motion.span
              key={w}
              variants={word}
              style={{ display: "inline-block", color: i === 1 ? "#7C3AED" : undefined }}
            >
              {w}
            </motion.span>
          ))}
        </span>
      ))}
    </motion.h1>
  );
}

export function HeroAnimatedSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.55 }}
      className="mt-7 max-w-2xl t-body text-[#3C3C43]"
      style={{ fontSize: 19, lineHeight: 1.55 }}
    >
      {children}
    </motion.p>
  );
}

export function HeroAnimatedCtas({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.75 }}
    >
      {children}
    </motion.div>
  );
}

export function HeroAnimatedSide({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
      className="looper-hero-float-wrapper"
    >
      {children}
    </motion.div>
  );
}
