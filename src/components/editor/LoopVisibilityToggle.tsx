"use client";
import { useState } from "react";
import { Globe, Lock } from "lucide-react";
import { toast } from "sonner";

interface Props {
  systemId: string;
  currentVisibility: "public" | "private";
  canSetPrivate: boolean;
}

export function LoopVisibilityToggle({ systemId, currentVisibility, canSetPrivate }: Props) {
  const [visibility, setVisibility] = useState(currentVisibility);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = visibility === "public" ? "private" : "public";
    if (next === "private" && !canSetPrivate) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/systems/${systemId}/visibility`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Failed to update visibility");
      }
      setVisibility(next);
      toast.success(next === "private" ? "Loop is now private" : "Loop is now public");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const isPrivate = visibility === "private";

  if (!canSetPrivate && !isPrivate) {
    return (
      <button
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#F5F5F7] text-[#8E8E93] border border-black/[0.06] cursor-pointer hover:bg-[#EBEBED] transition-colors"
        onClick={() => {
          toast.info("Upgrade to Pro to make this loop private.", { description: "Private loops require the Pro plan." });
        }}
        title="Upgrade to Pro to make this loop private"
      >
        <Globe size={12} />
        Public
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isPrivate ? "Click to make public" : "Click to make private"}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
        isPrivate
          ? "bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]"
          : "bg-[#F5F5F7] text-[#3C3C43] border-black/[0.06] hover:bg-[#EBEBED]"
      }`}
    >
      {isPrivate ? <Lock size={12} /> : <Globe size={12} />}
      {isPrivate ? "Private" : "Public"}
    </button>
  );
}
