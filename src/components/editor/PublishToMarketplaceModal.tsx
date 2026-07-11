"use client";
import { useState } from "react";
import { X, Store } from "lucide-react";
import { toast } from "sonner";

interface Props {
  systemId: string;
  systemName: string;
  onClose: () => void;
}

export function PublishToMarketplaceModal({ systemId, systemName, onClose }: Props) {
  const [price, setPrice] = useState<"free" | "paid">("free");
  const [priceDollars, setPriceDollars] = useState("9");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/systems/${systemId}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          description,
          price: price === "free" ? 0 : parseFloat(priceDollars),
        }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Failed to publish");
      }
      setDone(true);
      toast.success("Loop published to marketplace!");
    } catch (err) {
      const msg = (err as Error).message;
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="surface-canvas rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store size={18} className="text-[#4F46E5]" />
            <h2 className="t-h3 font-semibold text-ink-1">Publish to Marketplace</h2>
          </div>
          <button onClick={onClose} className="text-ink-3 hover:text-ink-2"><X size={18} /></button>
        </div>

        {done ? (
          <div className="text-center py-6 flex flex-col gap-3">
            <p className="t-body text-ink-2">
              <strong>{systemName}</strong> has been submitted to the marketplace.
            </p>
            <p className="t-caption text-ink-3">
              Your listing will be reviewed before it appears publicly. You can track it from your dashboard.
            </p>
            <a href="/dashboard" className="mt-2 inline-block text-[#4F46E5] t-label hover:underline">
              Back to dashboard &rarr;
            </a>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <label className="t-label text-ink-2">Short description</label>
              <textarea
                className="border border-black/[0.1] rounded-lg px-3 py-2 t-body text-ink-1 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="What does this loop do? Who is it for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="t-label text-ink-2">Pricing</label>
              <div className="flex gap-2">
                {(["free", "paid"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPrice(p)}
                    className={`flex-1 py-2 rounded-lg t-label font-medium border transition-colors ${
                      price === p
                        ? "bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]"
                        : "bg-[var(--surface-subtle)] text-ink-2 border-line hover:bg-[#EBEBED]"
                    }`}
                  >
                    {p === "free" ? "Free" : "Paid"}
                  </button>
                ))}
              </div>
              {price === "paid" && (
                <div className="flex items-center gap-2">
                  <span className="t-label text-ink-3">$</span>
                  <input
                    type="number"
                    min="1"
                    value={priceDollars}
                    onChange={(e) => setPriceDollars(e.target.value)}
                    className="border border-black/[0.1] rounded-lg px-3 py-1.5 t-label w-24 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="t-label text-ink-3">USD</span>
                </div>
              )}
            </div>

            <button
              onClick={submit}
              disabled={submitting || !description.trim()}
              className="w-full py-2.5 bg-[#4F46E5] text-white rounded-xl t-label font-medium hover:bg-[#4338CA] disabled:opacity-50 transition-colors"
            >
              {submitting ? "Publishing..." : "Publish loop"}
            </button>
            {errorMsg ? (
              <p className="t-caption text-red-600 text-center">{errorMsg}</p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
