interface SectionBadgeProps {
  label: string;
  tone?: "indigo" | "neutral";
  className?: string;
}

export function SectionBadge({
  label,
  tone = "indigo",
  className,
}: SectionBadgeProps) {
  const isIndigo = tone === "indigo";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 t-caption font-semibold",
        isIndigo
          ? "border-violet-100 bg-violet-50 text-violet-700"
          : "border-black/[0.08] bg-white text-[#3C3C43]",
        className ?? "",
      ].join(" ")}
    >
      <span className="uppercase tracking-[0.08em]">{label}</span>
    </span>
  );
}
