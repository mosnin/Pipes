"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";

/**
 * TemplateFilterRail
 *
 * Sticky left rail used on the templates gallery. Three collapsible
 * sections: Category (multi-chips), Complexity (radios), Use case (chips).
 * Clicking a chip toggles its presence in the matching set.
 *
 * Selected filters are reported to the parent via onChange. The parent
 * owns visible state.
 */

export interface TemplateFilterValue {
  /** Selected category id, or "all" for everything. */
  category: string;
  /** Selected complexity, or "all" for everything. */
  complexity: string;
  /** Selected use case id, or "all" for everything. */
  useCase: string;
}

export interface TemplateFilterRailProps {
  categories: ReadonlyArray<string>;
  useCases: ReadonlyArray<string>;
  value: TemplateFilterValue;
  onChange: (next: TemplateFilterValue) => void;
  counts?: {
    simple: number;
    standard: number;
    advanced: number;
  };
}

const COMPLEXITY_OPTIONS = [
  { id: "all", label: "All", description: "Every starter" },
  { id: "simple", label: "Simple", description: "One-prompt builds" },
  { id: "standard", label: "Standard", description: "Multi-step builds" },
  { id: "advanced", label: "Advanced", description: "Multi-agent builds" },
] as const;

export function TemplateFilterRail({
  categories,
  useCases,
  value,
  onChange,
  counts,
}: TemplateFilterRailProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    category: true,
    complexity: true,
    useCase: true,
  });

  function toggle(section: string) {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  const isActive = (kind: keyof TemplateFilterValue, id: string) => value[kind] === id;

  function set(kind: keyof TemplateFilterValue, id: string) {
    onChange({ ...value, [kind]: id });
  }

  return (
    <aside
      aria-label="Filter starters"
      data-testid="template-filter-rail"
      className="w-full lg:w-60 shrink-0"
    >
      <div className="lg:sticky lg:top-24 flex flex-col gap-3">
        <header className="flex items-center justify-between">
          <h2 className="t-overline text-[#8E8E93]">Filters</h2>
          {(value.category !== "all" || value.complexity !== "all" || value.useCase !== "all") && (
            <button
              type="button"
              onClick={() =>
                onChange({ category: "all", complexity: "all", useCase: "all" })
              }
              className="t-caption text-indigo-600 hover:text-indigo-700"
            >
              Reset
            </button>
          )}
        </header>

        <Section
          id="category"
          label="Category"
          open={openSections.category}
          onToggle={() => toggle("category")}
        >
          <div className="flex flex-wrap gap-1.5">
            <Chip
              active={isActive("category", "all")}
              onClick={() => set("category", "all")}
            >
              All
            </Chip>
            {categories.map((cat) => (
              <Chip
                key={cat}
                active={isActive("category", cat)}
                onClick={() => set("category", cat)}
              >
                {cat}
              </Chip>
            ))}
          </div>
        </Section>

        <Section
          id="complexity"
          label="Complexity"
          open={openSections.complexity}
          onToggle={() => toggle("complexity")}
        >
          <div role="radiogroup" aria-label="Complexity" className="flex flex-col gap-1">
            {COMPLEXITY_OPTIONS.map((opt) => {
              const active = isActive("complexity", opt.id);
              const count =
                opt.id === "simple"
                  ? counts?.simple
                  : opt.id === "standard"
                    ? counts?.standard
                    : opt.id === "advanced"
                      ? counts?.advanced
                      : undefined;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set("complexity", opt.id)}
                  className={[
                    "flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "bg-indigo-50 border-indigo-200 text-[#111]"
                      : "bg-white border-black/[0.06] text-[#111] hover:bg-[#FAFAFA]",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={[
                        "h-3.5 w-3.5 rounded-full border-2 shrink-0",
                        active ? "border-indigo-600" : "border-[#C7C7CC]",
                      ].join(" ")}
                      style={
                        active
                          ? { boxShadow: "inset 0 0 0 3px #4F46E5" }
                          : undefined
                      }
                    />
                    <span className="flex flex-col">
                      <span className="t-label font-medium text-[#111]">{opt.label}</span>
                      <span className="t-caption text-[#8E8E93]">{opt.description}</span>
                    </span>
                  </span>
                  {count != null && (
                    <span className="t-caption text-[#8E8E93] tabular-nums">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        <Section
          id="useCase"
          label="Use case"
          open={openSections.useCase}
          onToggle={() => toggle("useCase")}
        >
          <div className="flex flex-wrap gap-1.5">
            <Chip
              active={isActive("useCase", "all")}
              onClick={() => set("useCase", "all")}
            >
              All
            </Chip>
            {useCases.map((uc) => (
              <Chip
                key={uc}
                active={isActive("useCase", uc)}
                onClick={() => set("useCase", uc)}
                title={uc}
              >
                <span className="block max-w-[12rem] truncate">{uc}</span>
              </Chip>
            ))}
          </div>
        </Section>
      </div>
    </aside>
  );
}

function Section({
  id,
  label,
  open,
  onToggle,
  children,
}: {
  id: string;
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <section
      data-testid={`filter-section-${id}`}
      className="rounded-2xl border border-black/[0.06] bg-white"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="t-label font-semibold text-[#111]">{label}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className="text-[#8E8E93] transition-transform"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>
      <motion.div
        initial={false}
        animate={{
          height: open ? "auto" : 0,
          opacity: open ? 1 : 0,
        }}
        transition={reduced ? { duration: 0 } : { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4">{children}</div>
      </motion.div>
    </section>
  );
}

function Chip({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 t-caption font-medium transition-colors",
        active
          ? "bg-[#111] text-white border-[#111]"
          : "bg-white text-[#3C3C43] border-black/[0.08] hover:border-black/[0.16] hover:text-[#111]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
