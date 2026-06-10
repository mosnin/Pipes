"use client";

// PricingTierLiveDemo
//
// Mounts inside the highlighted (Team / Builder) tier card. A small canvas that
// loops the customer-support-triage build at 1.5x. Caption below names what the
// viewer is watching. No copy that screams "live demo" — just a tight, honest
// loop.

import { EmbeddedCanvas } from "@/components/marketing/EmbeddedCanvas";

export interface PricingTierLiveDemoProps {
  templateId?: string;
}

export function PricingTierLiveDemo({
  templateId = "customer-support-triage",
}: PricingTierLiveDemoProps) {
  return (
    <div className="mt-6 flex flex-col gap-2" data-testid="pricing-tier-live-demo">
      <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-white">
        <EmbeddedCanvas
          templateId={templateId}
          autoplay="onView"
          loop
          speed={1.5}
          aspectClassName="aspect-[2/1]"
        />
      </div>
      <p className="t-caption text-[#8E8E93] leading-relaxed">
        Watch the agent build a customer-support triage system in two seconds.
      </p>
    </div>
  );
}
