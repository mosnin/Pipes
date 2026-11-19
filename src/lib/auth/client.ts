/**
 * Calls Better Auth's endpoints under /api/auth from the browser and turns
 * every answer into one shape with a sentence a person can act on.
 * Same-origin only; Better Auth checks the Origin header.
 */

export type AuthResult<T = Record<string, unknown>> = { ok: true; status: number; data: T } | { ok: false; status: number; code?: string; message: string };

/** Better Auth's error codes, in Pipes' words. Anything not listed falls back to the server's own message. */
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "That email and password don't match an account.",
  USER_ALREADY_EXISTS: "An account with that email already exists. Log in instead.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "An account with that email already exists. Log in instead.",
  INVALID_TWO_FACTOR_AUTHENTICATION: "That code is not right. Use the newest code from your app, or a recovery code.",
  INVALID_CODE: "That code is not right. Use the newest code from your app, or a recovery code.",
  INVALID_BACKUP_CODE: "That recovery code is not right, or it was already used.",
  INVALID_TOKEN: "This reset link has expired or was already used. Ask for a new one.",
  INVALID_PASSWORD: "That password is not right.",
  PASSWORD_TOO_SHORT: "Use at least 10 characters.",
  PASSWORD_TOO_LONG: "Use at most 200 characters.",
  INVALID_TWO_FACTOR_COOKIE: "That took too long. Sign in again."
};

export async function authCall<T = Record<string, unknown>>(path: string, body?: unknown, method: "POST" | "GET" = "POST"): Promise<AuthResult<T>> {
  try {
    const res = await fetch(`/api/auth${path}`, { method, headers: { "content-type": "application/json" }, body: method === "POST" ? JSON.stringify(body ?? {}) : undefined, credentials: "same-origin" });
    const json = (await res.json().catch(() => null)) as (T & { code?: string; message?: string }) | null;
    if (res.ok) return { ok: true, status: res.status, data: (json ?? {}) as T };
    const code = json?.code;
    if (res.status === 429) return { ok: false, status: 429, code, message: "Too many attempts from this network. Wait a few minutes and try again." };
    return { ok: false, status: res.status, code, message: (code && MESSAGES[code]) || json?.message || "Something went wrong. Try again." };
  } catch {
    return { ok: false, status: 0, message: "Pipes could not be reached. Check your connection and try again." };
  }
}

/** The secret inside an otpauth:// link, to show for typing into an authenticator app. */
export function secretFromTotpUri(uri: string): string {
  try {
    return new URL(uri).searchParams.get("secret") ?? "";
  } catch {
    return "";
  }
}

/** Sign out and leave. Ends the session on the server (Better Auth), then goes to the home page. */
export async function signOutAndLeave(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin", redirect: "manual" }).catch(() => undefined);
  window.location.href = "/";
}
