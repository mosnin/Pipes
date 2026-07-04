// Convex auth: validates the Clerk-issued JWT so ctx.auth.getUserIdentity()
// returns the caller inside queries/mutations. Both the browser (via
// ConvexProviderWithClerk) and the Next.js server (which forwards the user's
// Clerk token to the Convex HTTP client) present this token, and the data
// functions in app.ts authorize workspace membership against it.
//
// Setup (provider mode only):
//   1. In Clerk, create a JWT template named exactly "convex".
//   2. Set CLERK_JWT_ISSUER_DOMAIN on the Convex deployment to your Clerk
//      Frontend API URL (e.g. https://clever-flamingo-1.clerk.accounts.dev).
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
