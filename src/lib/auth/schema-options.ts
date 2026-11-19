import type { BetterAuthOptions } from "better-auth";
import { twoFactor } from "better-auth/plugins/two-factor";

/**
 * The parts of Pipes' Better Auth config that shape its tables: plugins and
 * extra fields. Kept free of server-only imports so the Convex component and
 * `npx auth@1.7 generate` can load it (docs/security.md, "Better Auth").
 */
export const authSchemaOptions = {
  appName: "Pipes",
  user: {
    additionalFields: {
      // Pipes' identity key: `users.externalId` in Convex and the mock store. Never set from input.
      externalId: { type: "string", required: false, input: false }
    }
  },
  session: {
    additionalFields: {
      // Whether this session passed a second factor. Set by Pipes from the sign-in path, never from input.
      mfa: { type: "boolean", required: false, input: false, defaultValue: false }
    }
  },
  plugins: [twoFactor({ issuer: "Pipes" })]
} satisfies Partial<BetterAuthOptions>;
