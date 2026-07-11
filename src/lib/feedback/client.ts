// Fire-and-forget POST helper for /api/feedback. The editor must never block
// on feedback writes; if the route 404s (Agent C not yet shipped) we swallow
// the error in production and log in dev.

import type { FeedbackBody, FeedbackResponse } from "./types";

export async function sendFeedback(body: FeedbackBody): Promise<FeedbackResponse> {
  try {
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[feedback] POST /api/feedback ${res.status}`);
      }
      return { ok: false, error: `${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[feedback] network error", e);
    }
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}
