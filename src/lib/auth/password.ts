import "server-only";
import crypto from "node:crypto";

const KEY_LENGTH = 64;
const COST = 16384;

/** scrypt with a per-password salt, stored as `scrypt$N$salt$hash`. */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH, { N: COST }).toString("base64url");
  return ["scrypt", COST, salt, hash].join("$");
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, cost, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = crypto.scryptSync(password, salt, expected.length, { N: Number(cost) || COST });
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 10) return "Use at least 10 characters.";
  if (password.length > 200) return "Use at most 200 characters.";
  return null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPlausibleEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
