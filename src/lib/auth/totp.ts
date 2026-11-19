import crypto from "node:crypto";

/**
 * Time-based one-time passwords (RFC 6238 over RFC 4226): HMAC-SHA1, 30
 * second steps, 6 digits, which is what every authenticator app speaks.
 * A code is accepted one step either side of now to allow for clock drift,
 * and the caller stores the last step used so a code cannot be replayed.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const STEP_SECONDS = 30;
export const DIGITS = 6;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    value = (value << 5) | ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A new 160-bit secret, base32 encoded. */
export function newSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function codeAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

export const stepAt = (ms: number) => Math.floor(ms / 1000 / STEP_SECONDS);

/**
 * The step the code matches, within one step of now and after `lastStep`
 * (so each code works once), or null.
 */
export function verifyCode(secret: string, code: string, nowMs: number, lastStep = -1): number | null {
  const clean = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const current = stepAt(nowMs);
  for (const step of [current, current - 1, current + 1]) {
    if (step <= lastStep) continue;
    const expected = Buffer.from(codeAt(secret, step));
    if (crypto.timingSafeEqual(expected, Buffer.from(clean))) return step;
  }
  return null;
}

/** The link an authenticator app reads, for a QR code or tapping on a phone. */
export function otpauthUrl(secret: string, account: string, issuer = "Pipes"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

/** Ten single-use recovery codes, like `k7f3-9qzx`. Stored only as hashes. */
export function newRecoveryCodes(count = 10): string[] {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: count }, () => {
    const bytes = crypto.randomBytes(8);
    const s = Array.from(bytes, (b) => chars[b % chars.length]).join("");
    return `${s.slice(0, 4)}-${s.slice(4)}`;
  });
}

export const hashRecoveryCode = (code: string) => crypto.createHash("sha256").update(code.trim().toLowerCase().replace(/\s+/g, "")).digest("hex");
