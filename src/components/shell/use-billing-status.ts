"use client";

import { useEffect, useState } from "react";
import type { Entitlements } from "@/domain/templates/plans";

export interface BillingStatus {
  plan: "Free" | "Pro" | "Builder";
  status: string;
  entitlements: Entitlements;
  billingMode: "mock" | "creem" | "unconfigured";
  hasBillingCustomer: boolean;
}

/**
 * The workspace plan, read once from `/api/billing/status`, so a page can say
 * what a plan does not include before someone clicks and fails. `null` while
 * loading or when the read fails: callers then leave the action enabled and
 * let the server's own message speak.
 */
export function useBillingStatus(): BillingStatus | null {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/billing/status", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (live && json?.ok && json.data) setStatus(json.data as BillingStatus);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return status;
}
