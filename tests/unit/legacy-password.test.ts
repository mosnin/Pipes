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
