import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

interface FeatureCardProps {
  icon?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  cta?: string;
  isNew?: boolean;
  className?: string;
}

export function FeatureCard({
  icon,
  eyebrow,
  title,
  description,
  href,
  cta,
  isNew = false,
  className,
}: FeatureCardProps) {
  const inner = (
    <div
      className={[
        "group relative flex h-full flex-col gap-4 rounded-[12px] border border-black/[0.08] bg-white p-6",
        "transition-all duration-200",
        href ? "hover:border-black/[0.14] hover:shadow-sm-token" : "",
        className ?? "",
      ].join(" ")}
    >
      {isNew && (
        <span className="absolute right-4 top-4 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 t-micro font-semibold uppercase tracking-[0.08em] text-emerald-700">
          New
        </span>
      )}

      {icon != null && (
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
          {icon}
        </span>
      )}

      <div className="flex flex-col gap-1.5">
        {eyebrow != null && (
          <span className="t-overline text-[#8E8E93]">{eyebrow}</span>
        )}
        <h3 className="t-title text-[#111]">{title}</h3>
        {description != null && (
          <p className="t-label text-[#3C3C43] leading-relaxed">{description}</p>
        )}
      </div>

      {href != null && cta != null && (
        <span className="mt-auto inline-flex items-center gap-1 t-label font-semibold text-indigo-600 group-hover:text-indigo-700">
          {cta}
          <ArrowUpRight size={14} aria-hidden="true" />
        </span>
      )}
    </div>
  );

  if (href != null) {
    return (
      <Link
        href={href}
        className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded-[12px]"
      >
        {inner}
      </Link>
    );
  }

  return inner;
}
