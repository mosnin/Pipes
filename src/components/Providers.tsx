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
      <Toaster
        position="top-right"
        expand
        closeButton
        richColors
        toastOptions={{
          classNames: {
            toast:
              "bg-white border border-black/[0.08] shadow-md-token text-[#111] rounded-[12px]",
            title: "t-label font-semibold text-[#111]",
            description: "t-caption text-[#3C3C43]",
            actionButton: "t-label text-[#111]",
            cancelButton: "t-label text-[#3C3C43]",
          },
        }}
      />
    </>
  );
}
