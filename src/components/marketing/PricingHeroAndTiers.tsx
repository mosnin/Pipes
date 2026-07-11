"use client";

// Stateful wrapper that holds the monthly/yearly billing toggle state and
// feeds both the toggle control and the tier grid. Kept thin so the page
// itself can stay a server component for everything else.

import { useState } from "react";
import { PricingBillingToggle, type BillingPeriod } from "./PricingBillingToggle";
import { PricingTiersGrid, type PricingTier } from "./PricingTiersGrid";

interface PricingHeroAndTiersProps {
  tiers: readonly PricingTier[];
}

export function PricingHeroAndTiers({ tiers }: PricingHeroAndTiersProps) {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  return (
    <>
      <div className="flex justify-center">
        <PricingBillingToggle value={period} onChange={setPeriod} />
      </div>
      <div className="mt-16 px-6">
        <PricingTiersGrid tiers={tiers} period={period} />
      </div>
    </>
  );
}
