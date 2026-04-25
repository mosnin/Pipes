"use client";

import { useEffect } from "react";

interface SignupSourceTrackerProps {
  source: string;
}

export function SignupSourceTracker({ source }: SignupSourceTrackerProps) {
  useEffect(() => {
    fetch("/api/marketing/signal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: "logged_out_signup_entry_source",
        metadata: { source },
      }),
    });
  }, [source]);

  return null;
}
