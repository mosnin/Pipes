import type { Metadata } from "next";
import { MarketplaceGallery } from "./MarketplaceGallery";
import { MARKETPLACE_LISTINGS } from "@/lib/marketplace/catalog";

export const metadata: Metadata = {
  title: "Loop Marketplace - Looper",
  description: "Ready-to-use loop templates for research, support, code review, sales, and more. Import any loop into your workspace in one click.",
};

export type { MarketplaceListing } from "@/lib/marketplace/catalog";

export default function MarketplacePage() {
  return <MarketplaceGallery listings={MARKETPLACE_LISTINGS} />;
}
