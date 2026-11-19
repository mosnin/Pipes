import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { API_SURFACE_HEADER, HttpError } from "@/lib/api/errors";
import { getAuthService, resolveAuthMode, revokeSessionToken } from "@/lib/auth";
import { resolveRuntimeMode } from "@/lib/env";
import { getRepositories } from "@/lib/composition/repositories";
import { createBoundedServices } from "@/domain/services/bounded";
import { createSecurityService, DEFAULT_POLICY, domainAllowed, sessionProblem } from "@/domain/auth/security";

export { getRepositories };

/** Why a signed-in person cannot use the workspace right now. */
export type PolicyBlock = "domain" | "two_step";

/**
 * Everything a signed-in request needs: who is asking, their workspace and
 * role, and the services. It also applies the workspace's security policy
 * (docs/security.md) on every request, so a policy change takes effect at
 * once: someone outside the allowed email domains, or without two-step
 * sign-in where it is required, is sent to /security-check instead.
 */
export async function getServerApp(options: { skipPolicy?: boolean } = {}) {
  const runtime = resolveRuntimeMode();
  const api = (await headers()).get(API_SURFACE_HEADER) === "api";
  const auth = getAuthService();
  // Pages send people to sign in; API calls get a 401 they can act on.
  const identity = api ? await auth.getCurrentUser() : await auth.requireUser();
  if (!identity) throw new HttpError(401, "unauthenticated", "Sign in to continue. Your session has ended or was signed out.");
  const repositories = getRepositories();

  // Only the identity fields: session details are not the user record (and Convex rejects unknown fields).
  const ctx = await repositories.users.provision({ externalId: identity.externalId, email: identity.email, name: identity.name });
  const mode = resolveAuthMode();
  const security = createSecurityService(repositories);
  const policy = mode === "mock" ? DEFAULT_POLICY : await security.policy(ctx.workspaceId);

  // The workspace's session rules: its idle limit, and 7 days at most however active.
  const ended = mode === "mock" ? null : sessionProblem({ createdAt: identity.sessionCreatedAt, updatedAt: identity.sessionUpdatedAt }, policy);
  if (ended) {
    if (identity.sessionToken) await revokeSessionToken(identity.sessionToken).catch(() => undefined);
    await security.record({ type: "session.expired", externalId: identity.externalId, email: identity.email, workspaceId: ctx.workspaceId, detail: { reason: ended } });
    if (api) throw new HttpError(401, "unauthenticated", ended === "idle" ? "Your session ended after a period without use. Sign in again." : "Sessions last 7 days at most. Sign in again.");
    redirect(`/login?error=session_${ended}`);
  }
  const blocked: PolicyBlock | null = !domainAllowed(identity.email, policy.allowedDomains) ? "domain" : policy.requireMfa && mode === "password" && !identity.mfa ? "two_step" : null;
  if (blocked && !options.skipPolicy) {
    if (api) throw new HttpError(403, "security_policy", blocked === "two_step" ? "Your workspace requires two-step sign-in. Set it up at /security-check to continue." : `This workspace only allows emails at ${policy.allowedDomains.join(", ")}.`, { reason: blocked });
    redirect(`/security-check?reason=${blocked}`);
  }

  const plan = await repositories.entitlements.getPlan(ctx.workspaceId);
  const services = createBoundedServices(repositories);

  return {
    identity,
    ctx: { ...ctx, plan },
    policy,
    blocked,
    services,
    repositories,
    runtimeMode: runtime.mode,
    runtimeWarning: runtime.warning
  };
}
