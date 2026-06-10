"use client";

// Apple-style accordion FAQ. Click an item; its answer expands with a smooth
// height transition that does not pop. Surrounding items shift gently as the
// answer grows. Reduced motion: snap open/closed.
//
// Only one item is open at a time. Clicking the open item closes it.

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

interface PricingFaqProps {
  items: readonly FaqItem[];
}

export function PricingFaq({ items }: PricingFaqProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const reduce = useReducedMotion();

  return (
    <div className="rounded-3xl border border-black/[0.06] bg-white overflow-hidden">
      <ul className="divide-y divide-black/[0.06]">
        {items.map((item) => {
          const isOpen = item.id === openId;
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`${item.id}-panel`}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-[#FAFAFA]"
              >
                <span className="t-title text-[#111]">{item.question}</span>
                <motion.span
                  aria-hidden="true"
                  animate={reduce ? undefined : { rotate: isOpen ? 45 : 0 }}
                  transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/[0.08] text-[#3C3C43]"
                  style={{ fontSize: 16, lineHeight: 1 }}
                >
                  +
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.section
                    id={`${item.id}-panel`}
                    key="content"
                    initial={
                      reduce ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }
                    }
                    animate={{ height: "auto", opacity: 1 }}
                    exit={
                      reduce ? { height: "auto", opacity: 0 } : { height: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                    style={{ overflow: "hidden" }}
                  >
                    <div className="px-6 pb-6 pr-12 t-body text-[#3C3C43] leading-relaxed">
                      {item.answer}
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
