"use client";

import { ConvexProvider } from "convex/react";
import { Toaster } from "sonner";
import { getConvexReactClient } from "@/lib/convex/reactClient";
import { clientRuntimeFlags } from "@/lib/env/client";

export function Providers({ children }: { children: React.ReactNode }) {
  const inner = clientRuntimeFlags.useMocks || !clientRuntimeFlags.hasConvex
    ? <>{children}</>
    : <ConvexProvider client={getConvexReactClient()}>{children}</ConvexProvider>;

  return (
    <>
      {inner}
      <Toaster position="bottom-right" richColors closeButton />
    </>
  );
}
