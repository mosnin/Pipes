"use client";

import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { getConvexReactClient } from "@/lib/convex/reactClient";
import { clientRuntimeFlags } from "@/lib/env/client";

export function Providers({ children }: { children: React.ReactNode }) {
  // In provider mode the browser talks to Convex directly (the editor's live
  // getSystemBundle subscription). ConvexProviderWithClerk attaches the user's
  // Clerk token to every Convex call so the data functions can authorize
  // workspace membership — without it those functions fail closed. Mock mode
  // never mounts Convex.
  const inner = clientRuntimeFlags.useMocks || !clientRuntimeFlags.hasConvex
    ? <>{children}</>
    : <ConvexProviderWithClerk client={getConvexReactClient()} useAuth={useAuth}>{children}</ConvexProviderWithClerk>;

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
