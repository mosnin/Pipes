"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

interface Props {
  templateId: string;
  slug: string;
  className?: string;
}

export function TemplateUseCTA({ templateId, slug, className }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/templates/${templateId}/instantiate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json() as { ok: boolean; data?: { systemId: string } };
      if (res.ok && body.ok && body.data?.systemId) {
        router.push(`/systems/${body.data.systemId}`);
        return;
      }
    } catch {
      // fall through to signup
    }
    router.push(`/signup?source=template-${slug}`);
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={loading}
      className={className ?? "inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-white text-violet-600 font-semibold text-sm hover:bg-violet-50 transition-colors disabled:opacity-70"}
    >
      {loading ? "Opening..." : "Use this starter"}
      {!loading && <ArrowRight size={14} aria-hidden="true" />}
    </button>
  );
}
