import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

// The legacy scrypt format: accounts from before Better Auth still sign in with it (src/lib/auth/options.ts).
describe("password hashing", () => {
  it("verifies the right password and rejects the wrong one", () => {
    const stored = hashPassword("correct horse battery");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("correct horse battery", stored)).toBe(true);
    expect(verifyPassword("wrong horse battery", stored)).toBe(false);
  });

  it("salts every hash", () => {
    expect(hashPassword("same password here")).not.toBe(hashPassword("same password here"));
  });
});

describe("Convex errors", () => {
  it("never pass call arguments, keys or tokens through to callers", async () => {
    const { cleanConvexError } = await import("@/lib/convex/httpClient");
    const leak = new Error('[Request ID: abc] Server Error\nArgumentValidationError: Object contains extra field `mfa` that is not in the validator.\n\nObject: {serverKey: "k-123-secret", sessionToken: "tok"}');
    expect(cleanConvexError(leak, "k-123-secret").message).toBe("Something went wrong on the server. Try again.");
    const own = new Error("[Request ID: abc] Server Error\nUncaught Error: The Owner cannot be removed.\n    at handler (../convex/app.ts:12:3)");
    expect(cleanConvexError(own).message).toBe("The Owner cannot be removed.");
    expect(cleanConvexError(new Error("plain k-123-secret"), "k-123-secret").message).toBe("plain [redacted]");
  });
});
