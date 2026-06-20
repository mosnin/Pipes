"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle, Download, Star } from "lucide-react";
import { toast } from "sonner";
import { Button, EmptyState, SearchInput } from "@/components/ui";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import type { MarketplaceListing } from "./page";

type PriceFilter = "all" | "free" | "paid";
type CategoryFilter = string;

const CATEGORY_ORDER = ["Research", "Support", "Code", "Sales", "Data", "Content", "Security", "DevOps"] as const;

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 t-caption text-[#8E8E93]">
      <Star size={11} className="fill-amber-400 text-amber-400" aria-hidden />
      <span className="font-medium text-[#111]">{rating.toFixed(1)}</span>
      <span>({count})</span>
    </span>
  );
}

function InstallCount({ count }: { count: number }) {
  const label = count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
  return (
    <span className="inline-flex items-center gap-1 t-caption text-[#8E8E93]">
      <Download size={11} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

function PriceTag({ price }: { price: number }) {
  if (price === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 t-caption font-semibold text-emerald-700">
        Free
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-100 px-2 py-0.5 t-caption font-semibold text-indigo-700">
      ${price}/mo
    </span>
  );
}

type ImportResult = { ok: boolean; data?: { systemId: string }; error?: string };

async function postImport(listingId: string, name: string, payment?: string): Promise<Response> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (payment) headers["x-payment"] = payment;
  return fetch("/api/marketplace/import", {
    method: "POST",
    headers,
    body: JSON.stringify({ listingId, name }),
  });
}

async function handleUseLoop(listingId: string, name: string, price: number) {
  const toastId = toast.loading(price > 0 ? "Starting checkout..." : "Importing loop...");
  try {
    let res = await postImport(listingId, name);

    // 402 Payment Required: settle via x402, then retry with the payment.
    if (res.status === 402) {
      toast.loading(`Paying $${price} with x402...`, { id: toastId });
      const payRes = await fetch("/api/marketplace/pay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const payBody = (await payRes.json()) as { ok: boolean; data?: { payment: string }; error?: string };
      if (!payRes.ok || !payBody.ok || !payBody.data) {
        toast.error(payBody.error ?? "Payment could not be completed.", { id: toastId });
        return;
      }
      toast.loading("Installing your loop...", { id: toastId });
      res = await postImport(listingId, name, payBody.data.payment);
    }

    const body = (await res.json()) as ImportResult;
    if (res.ok && body.ok && body.data) {
      toast.success(price > 0 ? "Purchased and installed!" : "Loop imported!", { id: toastId });
      window.location.href = `/systems/${body.data.systemId}`;
    } else {
      toast.error(body.error ?? "Import failed", { id: toastId });
    }
  } catch {
    toast.error("Import failed. Please try again.", { id: toastId });
  }
}

function ListingCard({ listing }: { listing: MarketplaceListing }) {
  return (
    <article className="flex flex-col rounded-2xl border border-black/[0.08] bg-white p-5 gap-4 hover:border-indigo-200 hover:shadow-sm transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="t-label font-semibold text-[#111] truncate">{listing.title}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="t-caption text-[#8E8E93]">by {listing.creator.name}</span>
            {listing.creator.verified && (
              <CheckCircle size={11} className="text-indigo-500 shrink-0" aria-label="Verified creator" />
            )}
          </div>
        </div>
        <PriceTag price={listing.price} />
      </div>

      {/* Description */}
      <p className="t-caption text-[#3C3C43] leading-relaxed flex-1">{listing.description}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {listing.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-md bg-black/[0.04] px-1.5 py-0.5 t-micro text-[#3C3C43]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/[0.04]">
        <div className="flex items-center gap-3">
          <StarRating rating={listing.rating} count={listing.ratingCount} />
          <InstallCount count={listing.installCount} />
        </div>
        <div className="flex items-center gap-2">
          <TrackedLink
            href="/signup"
            event="marketplace_install_clicked"
            metadata={{ listingId: listing.id, price: listing.price }}
          >
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#111] text-white t-caption font-semibold hover:bg-indigo-700 transition-colors">
              Install
            </span>
          </TrackedLink>
          <button
            onClick={() => handleUseLoop(listing.id, listing.title, listing.price)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-[#4F46E5] text-white t-caption font-semibold hover:bg-[#4338CA] transition-colors"
          >
            {listing.price > 0 ? `Buy $${listing.price}` : "Use this loop"}
          </button>
        </div>
      </div>
    </article>
  );
}

export function MarketplaceGallery({ listings }: { listings: MarketplaceListing[] }) {
  const reduced = useReducedMotion();
  const [query, setQuery] = useState("");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const categories = useMemo(() => {
    const present = new Set(listings.map((l) => l.category));
    return CATEGORY_ORDER.filter((c) => present.has(c));
  }, [listings]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      if (priceFilter === "free" && l.price !== 0) return false;
      if (priceFilter === "paid" && l.price === 0) return false;
      if (categoryFilter !== "all" && l.category !== categoryFilter) return false;
      if (!q) return true;
      return [l.title, l.description, l.category, ...l.tags].join(" ").toLowerCase().includes(q);
    });
  }, [listings, priceFilter, categoryFilter, query]);

  const freeCount = listings.filter((l) => l.price === 0).length;
  const paidCount = listings.filter((l) => l.price > 0).length;

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="px-4 sm:px-6 pt-8 sm:pt-10">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="relative overflow-hidden rounded-[40px] surface-subtle border border-black/[0.04] px-6 py-12 sm:px-12 sm:py-16"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.6]"
              style={{
                backgroundImage:
                  "radial-gradient(60% 60% at 80% 20%, rgba(79,70,229,0.07) 0%, rgba(79,70,229,0) 70%)",
              }}
            />
            <div className="relative flex flex-col gap-5 max-w-2xl">
              <span className="t-overline text-[#8E8E93]">Marketplace</span>
              <h1 className="t-display text-[#111]">
                Loops built by the community.
              </h1>
              <p className="t-body text-[#3C3C43]">
                Browse, install, and remix loops from creators. Free loops to get started. Premium loops from verified builders.
              </p>
            </div>
            <div className="relative mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-white border border-black/[0.06] p-4">
                <p className="t-display font-bold text-[#111]" style={{ fontSize: 32, lineHeight: 1 }}>{listings.length}</p>
                <p className="t-caption text-[#8E8E93] mt-1">Loops available</p>
              </div>
              <div className="rounded-2xl bg-white border border-black/[0.06] p-4">
                <p className="t-display font-bold text-emerald-600" style={{ fontSize: 32, lineHeight: 1 }}>{freeCount}</p>
                <p className="t-caption text-[#8E8E93] mt-1">Free forever</p>
              </div>
              <div className="rounded-2xl bg-white border border-black/[0.06] p-4">
                <p className="t-display font-bold text-indigo-600" style={{ fontSize: 32, lineHeight: 1 }}>{paidCount}</p>
                <p className="t-caption text-[#8E8E93] mt-1">Premium loops</p>
              </div>
              <div className="rounded-2xl bg-white border border-black/[0.06] p-4">
                <p className="t-display font-bold text-[#111]" style={{ fontSize: 32, lineHeight: 1 }}>8</p>
                <p className="t-caption text-[#8E8E93] mt-1">Categories</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Toolbar */}
      <section className="sticky top-0 z-20 backdrop-blur-md bg-white/85 border-b border-black/[0.04] mt-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[200px]">
            <SearchInput value={query} onChange={setQuery} placeholder="Search loops..." />
          </div>
          {/* Price filter */}
          <div className="flex items-center gap-1 rounded-lg border border-black/[0.08] p-0.5 bg-white">
            {(["all", "free", "paid"] as PriceFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setPriceFilter(f)}
                className={`px-3 py-1.5 rounded-md t-caption font-medium transition-colors capitalize ${priceFilter === f ? "bg-[#111] text-white" : "text-[#8E8E93] hover:text-[#111]"}`}
              >
                {f}
              </button>
            ))}
          </div>
          <span className="t-caption text-[#8E8E93] tabular-nums hidden sm:inline">
            {visible.length} of {listings.length}
          </span>
        </div>
        {/* Category chips */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-3 flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1 rounded-full t-caption font-medium transition-colors border ${categoryFilter === "all" ? "border-[#111] bg-[#111] text-white" : "border-black/[0.08] text-[#8E8E93] hover:border-black/[0.18] hover:text-[#111]"}`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat === categoryFilter ? "all" : cat)}
              className={`px-3 py-1 rounded-full t-caption font-medium transition-colors border ${categoryFilter === cat ? "border-indigo-600 bg-indigo-600 text-white" : "border-black/[0.08] text-[#8E8E93] hover:border-black/[0.18] hover:text-[#111]"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="px-4 sm:px-6 mt-8 pb-20">
        <div className="mx-auto max-w-7xl">
          {visible.length === 0 ? (
            <EmptyState
              title="No loops match"
              description="Try a different filter or search term."
              action={
                <Button variant="outline" onPress={() => { setQuery(""); setPriceFilter("all"); setCategoryFilter("all"); }}>
                  Reset filters
                </Button>
              }
            />
          ) : (
            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              <AnimatePresence mode="popLayout">
                {visible.map((listing, idx) => (
                  <motion.div
                    key={listing.id}
                    layout
                    initial={reduced ? false : { opacity: 0, scale: 0.97, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 4 }}
                    transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1], delay: reduced ? 0 : Math.min(idx, 9) * 0.025 }}
                  >
                    <ListingCard listing={listing} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Sell CTA */}
          <div className="mt-16 rounded-[40px] bg-indigo-50 border border-indigo-100 px-6 py-10 sm:px-10 sm:py-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1.5 max-w-md">
              <h2 className="t-h3 text-[#111]">Sell your loop</h2>
              <p className="t-label text-[#3C3C43]">
                Publish a loop you built. Set your price. Earn on every install. Pro plan required.
              </p>
            </div>
            <TrackedLink href="/signup" event="marketplace_sell_cta_clicked" metadata={{ location: "bottom_cta" }}>
              <Button variant="primary">
                Start selling
                <ArrowRight size={14} className="ml-1.5" aria-hidden="true" />
              </Button>
            </TrackedLink>
          </div>
        </div>
      </section>
    </main>
  );
}
