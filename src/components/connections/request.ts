/** The workflow API's envelope: `{ ok, data }` or `{ ok: false, error, message }`. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; message: string };

/** Fetch JSON from a Pipes route and never throw: a network failure comes back as a message. */
export async function request<T>(url: string, init?: { method?: string; body?: unknown }): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: init?.method ?? "GET",
      headers: init?.body === undefined ? undefined : { "content-type": "application/json" },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body)
    });
    const json = await res.json().catch(() => null);
    if (json && json.ok) return { ok: true, data: json.data as T };
    return { ok: false, error: json?.error ?? "request_failed", message: json?.message ?? json?.error ?? "That did not work. Try again." };
  } catch {
    return { ok: false, error: "network", message: "Pipes could not be reached. Check your connection and try again." };
  }
}
