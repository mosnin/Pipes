import type { ReactNode } from "react";

interface SectionBadgeProps {
  icon?: ReactNode;
  label: string;
  tone?: "indigo" | "neutral";
  className?: string;
}

export function SectionBadge({
  icon,
  label,
  tone = "indigo",
  className,
}: SectionBadgeProps) {
  const isIndigo = tone === "indigo";
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 t-caption font-semibold",
        isIndigo
          ? "border-indigo-100 bg-indigo-50 text-indigo-700"
          : "border-black/[0.08] bg-white text-[#3C3C43]",
        className ?? "",
      ].join(" ")}
    >
      {icon}
      <span className="uppercase tracking-[0.08em]">{label}</span>
    </span>
  );
}
