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

/**
 * The most used passwords and patterns from public breach lists. A password
 * on this list, or one built from the account's own email, is refused
 * whatever its length.
 */
const COMMON = new Set(
  "password password1 password12 password123 password1234 passw0rd p@ssw0rd p@ssword 123456789 1234567890 12345678910 0123456789 qwertyuiop qwerty123 qwerty1234 1q2w3e4r5t 1qaz2wsx3edc iloveyou1 iloveyou12 letmein123 welcome123 welcome1234 admin12345 administrator changeme123 trustno1234 football123 baseball123 sunshine123 princess123 dragon1234 monkey12345 superman123 starwars123 abc1234567 aaaaaaaaaa 1111111111 0000000000 987654321 9876543210 zaq12wsxcde asdfghjkl1 asdfghjkl; qazwsxedc1 michael123 jennifer123 computer123 internet123 whatever123 freedom123 shadow1234 master1234 hello12345 secret1234 summer2024 summer2025 summer2026 winter2024 winter2025 winter2026 spring2025 spring2026 autumn2025 pipes12345 pipespassword"
    .split(" ")
);

export function validatePasswordStrength(password: string, email?: string): string | null {
  if (password.length < 10) return "Use at least 10 characters.";
  if (password.length > 200) return "Use at most 200 characters.";
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return "That password appears on lists of leaked passwords. Choose another.";
  if (/^(.)\1+$/.test(password)) return "Use more than one repeated character.";
  const local = email ? normalizeEmail(email).split("@")[0] : "";
  if (local.length >= 4 && lower.includes(local)) return "Leave your email address out of your password.";
  return null;
}

/** A hash to verify against when no account exists, so a wrong email takes as long as a wrong password. */
export const DECOY_HASH = hashPassword("pipes-decoy-password-for-equal-timing");

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isPlausibleEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
