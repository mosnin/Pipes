import crypto from "node:crypto";

export type SessionUser = {
  externalId: string;
  email: string;
  name: string;
};

type SessionPayload = SessionUser & { exp: number };

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function sign(body: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(body).digest("base64url");
}

/** Serialize a user into a tamper-evident `body.signature` cookie value. */
export function encodeSignedSession(user: SessionUser, secret: string, now = Date.now()): string {
  const payload: SessionPayload = { ...user, exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

/** Returns the user only if the signature is valid and the session has not expired. */
export function decodeSignedSession(value: string | undefined, secret: string, now = Date.now()): SessionUser | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = value.slice(0, dot);
  const signature = Buffer.from(value.slice(dot + 1));
  const expected = Buffer.from(sign(body, secret));
  if (signature.length !== expected.length || !crypto.timingSafeEqual(signature, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= now) return null;
    if (typeof payload.externalId !== "string" || typeof payload.email !== "string") return null;
    return { externalId: payload.externalId, email: payload.email, name: typeof payload.name === "string" ? payload.name : payload.email };
  } catch {
    return null;
  }
}

/** Only allow same-origin relative paths as post-login destinations (no open redirects). */
export function safeReturnTo(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
