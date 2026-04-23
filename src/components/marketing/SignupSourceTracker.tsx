"use client";

import { useEffect } from "react";

export function SignupSourceTracker({ source }: { source: string }) {
  useEffect(() => {
    fetch("/api/marketing/signal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "logged_out_signup_entry_source", metadata: { source } })
    });
  }, [source]);

  return null;
}
