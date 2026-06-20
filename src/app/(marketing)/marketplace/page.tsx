import type { Metadata } from "next";
import { MarketplaceGallery } from "./MarketplaceGallery";
import { MARKETPLACE_LISTINGS } from "@/lib/marketplace/catalog";

export const metadata: Metadata = {
  title: "Loop Marketplace - Looper",
  description: "Browse and install loops built by the community. Free and premium loops for research, support, code review, sales, and more.",
};

export type { MarketplaceListing } from "@/lib/marketplace/catalog";

export default function MarketplacePage() {
  return <MarketplaceGallery listings={MARKETPLACE_LISTINGS} />;
}
