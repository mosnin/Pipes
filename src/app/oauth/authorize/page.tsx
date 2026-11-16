import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/marketing/auth-frame";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { createOAuthService, OAUTH_SCOPES, OAuthError } from "@/domain/oauth/service";
import { getAuthService } from "@/lib/auth";
import { getRepositories } from "@/lib/composition/server";

export const metadata: Metadata = { title: "Connect an app", robots: { index: false } };
export const dynamic = "force-dynamic";

/** OAuth consent: an MCP client (Claude, Cursor, ChatGPT) asks to act in this workspace. */
export default async function AuthorizePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const raw = await searchParams;
  const params = new URLSearchParams(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string"));
  const query = params.toString();

  if (raw.error && !raw.client_id) {
    return (
      <AuthFrame title="Couldn't connect" subtitle="The app's request to connect to Pipes was not valid.">
        <Banner role="critical" title="Request rejected">
          {raw.error}
        </Banner>
      </AuthFrame>
    );
  }

  const user = await getAuthService().getCurrentUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(`/oauth/authorize?${query}`)}`);

  let request: Awaited<ReturnType<ReturnType<typeof createOAuthService>["validateAuthorizeRequest"]>>;
  try {
    request = await createOAuthService(getRepositories()).validateAuthorizeRequest(params);
  } catch (error) {
    return (
      <AuthFrame title="Couldn't connect" subtitle="The app's request to connect to Pipes was not valid.">
        <Banner role="critical" title="Request rejected">
          {error instanceof OAuthError ? error.message : "Unknown error."}
        </Banner>
      </AuthFrame>
    );
  }

  const scopes = request.scope.split(" ");
  return (
    <AuthFrame width={440} title={`Connect ${request.client.clientName}`} subtitle={`${request.client.clientName} wants to use Pipes as ${user.name} (${user.email}).`}>
      <div className="flex flex-col gap-4">
        <div className="rounded-12 border border-border bg-raised p-3">
          <p className="t-caption-medium text-ink">It will be able to</p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {scopes.map((scope) => (
              <li key={scope} className="t-body text-ink-2">
                {OAUTH_SCOPES[scope]?.label ?? scope}
              </li>
            ))}
          </ul>
          <p className="t-caption mt-2 text-ink-3">
            It gets an API token you can revoke any time under API tokens. It will return you to{" "}
            <span className="t-mono-hash break-all text-ink-2">{new URL(request.redirectUri).host || request.redirectUri}</span>.
          </p>
        </div>
        <form method="post" action="/api/oauth/authorize" className="flex flex-col gap-1.5">
          <input type="hidden" name="query" value={query} />
          <Button type="submit" name="decision" value="approve" variant="primary" size="lg" className="w-full">
            Allow access
          </Button>
          <Button type="submit" name="decision" value="deny" variant="secondary" size="lg" className="w-full">
            Deny
          </Button>
        </form>
      </div>
    </AuthFrame>
  );
}
