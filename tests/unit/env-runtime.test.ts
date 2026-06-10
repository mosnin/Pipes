import { describe, expect, it } from "vitest";
import { buildEnv } from "@/lib/env";

describe("runtime env parsing", () => {
  it("treats blank optional values as missing instead of throwing", () => {
    const parsed = buildEnv({
      NODE_ENV: "production",
      PIPES_USE_MOCKS: "false",
      NEXT_PUBLIC_APP_URL: "",
      CLERK_SECRET_KEY: "",
      CLERK_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
      CONVEX_URL: "",
      MODAL_EXECUTOR_URL: ""
    });

    expect(parsed.NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
    expect(parsed.CLERK_SECRET_KEY).toBeUndefined();
    expect(parsed.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBeUndefined();
    expect(parsed.CONVEX_URL).toBeUndefined();
    expect(parsed.MODAL_EXECUTOR_URL).toBeUndefined();
  });

  it("still rejects malformed URL values", () => {
    expect(() =>
      buildEnv({
        NODE_ENV: "development",
        NEXT_PUBLIC_APP_URL: "not-a-url"
      })
    ).toThrow();
  });
});
