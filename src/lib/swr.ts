/**
 * Client data fetching for SWR. Pipes routes answer `{ ok, data }` or
 * `{ ok: false, error, message? }`; the fetcher unwraps `data` and throws an
 * `ApiError` carrying a sentence the page can show, so a hook's `error` reads
 * the same way `callApi` failures always have.
 */

export class ApiError extends Error {
  /** The route's machine-readable error, such as `run_not_found`, when it sent one. */
  readonly code?: string;
  /** HTTP status, or 0 when the server could not be reached. */
  readonly status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const UNREACHABLE_MESSAGE = "Pipes could not be reached. Check your connection and try again.";

function messageOf(json: unknown, status: number): string {
  const body = json as { message?: unknown; error?: unknown } | null;
  if (typeof body?.message === "string") return body.message;
  const error = body?.error as { message?: unknown } | string | undefined;
  if (error && typeof error === "object" && typeof error.message === "string") return error.message;
  if (typeof error === "string") return error;
  return `The request failed with status ${status}.`;
}

/** GET a Pipes route and return its `data`, or throw an `ApiError`. */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    throw new ApiError(UNREACHABLE_MESSAGE, 0);
  }
  const json = (await res.json().catch(() => null)) as { ok?: unknown; data?: unknown; error?: unknown } | null;
  if (json && json.ok === true) return json.data as T;
  throw new ApiError(messageOf(json, res.status), res.status, typeof json?.error === "string" ? json.error : undefined);
}
