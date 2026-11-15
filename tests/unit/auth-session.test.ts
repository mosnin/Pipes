import { describe, expect, it } from "vitest";
import { decodeSignedSession, encodeSignedSession, safeReturnTo, SESSION_TTL_SECONDS } from "@/lib/auth/session";

const secret = "a".repeat(32);
const user = { externalId: "auth0|123", email: "owner@example.com", name: "Owner" };

describe("signed sessions", () => {
  it("round-trips a valid session", () => {
    expect(decodeSignedSession(encodeSignedSession(user, secret), secret)).toEqual(user);
  });

  it("rejects a session whose payload was edited to impersonate someone else", () => {
    const [, signature] = encodeSignedSession(user, secret).split(".");
    const forgedBody = Buffer.from(JSON.stringify({ ...user, email: "admin@example.com", exp: 9999999999 })).toString("base64url");
    expect(decodeSignedSession(`${forgedBody}.${signature}`, secret)).toBeNull();
  });

  it("rejects the old unsigned base64 JSON format", () => {
    const legacy = Buffer.from(JSON.stringify(user)).toString("base64url");
    expect(decodeSignedSession(legacy, secret)).toBeNull();
  });

  it("rejects sessions signed with a different secret", () => {
    expect(decodeSignedSession(encodeSignedSession(user, secret), "b".repeat(32))).toBeNull();
  });

  it("rejects expired sessions", () => {
    const issued = Date.now();
    const value = encodeSignedSession(user, secret, issued);
    expect(decodeSignedSession(value, secret, issued + (SESSION_TTL_SECONDS + 1) * 1000)).toBeNull();
  });

  it("rejects garbage", () => {
    expect(decodeSignedSession(undefined, secret)).toBeNull();
    expect(decodeSignedSession("", secret)).toBeNull();
    expect(decodeSignedSession("not.a.session", secret)).toBeNull();
  });
});

describe("safeReturnTo", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeReturnTo("/systems/sys_1")).toBe("/systems/sys_1");
  });

  it("blocks open redirects", () => {
    expect(safeReturnTo("https://evil.example")).toBe("/dashboard");
    expect(safeReturnTo("//evil.example")).toBe("/dashboard");
    expect(safeReturnTo("/\\evil.example")).toBe("/dashboard");
    expect(safeReturnTo(null)).toBe("/dashboard");
  });
});
