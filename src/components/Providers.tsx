"use client";

import { ConvexProvider } from "convex/react";
import { getConvexReactClient } from "@/lib/convex/reactClient";
import { clientRuntimeFlags } from "@/lib/env/client";

export function Providers({ children }: { children: React.ReactNode }) {
  if (clientRuntimeFlags.useMocks || !clientRuntimeFlags.hasConvex) return <>{children}</>;
  return <ConvexProvider client={getConvexReactClient()}>{children}</ConvexProvider>;
}
