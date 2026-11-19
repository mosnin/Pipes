"use client";

/**
 * Pipes' toasts are Podium's: Ding pills in the bottom right (src/lib/toast.tsx).
 * `useToast()` stays the call site API: it states what happened, in the past
 * tense. Pass `{ tone: "error" }` when it did not.
 */
import type { ReactNode } from "react";
import { PodiumToaster, toast } from "@/lib/toast";

type Show = (message: string, options?: { tone?: "success" | "error" | "info" }) => void;

const show: Show = (message, options) => {
  const tone = options?.tone ?? "success";
  if (tone === "error") toast.error(message);
  else if (tone === "info") toast.info(message);
  else toast.success(message);
};

/** Announce a completed action. */
export function useToast(): Show {
  return show;
}

/** Mounts the toaster once, in the app shell. */
export function ToastProvider({ children }: { children: ReactNode }): ReactNode {
  return (
    <>
      {children}
      <PodiumToaster />
    </>
  );
}
