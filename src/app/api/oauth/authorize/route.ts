import { NextResponse } from "next/server";
import { createOAuthService, OAuthError } from "@/domain/oauth/service";
import { getServerApp } from "@/lib/composition/server";

/** The consent form posts here. Approve issues a code; deny returns access_denied. */
export async function POST(request: Request) {
  const form = await request.formData();
  const params = new URLSearchParams(String(form.get("query") ?? ""));
  const { ctx, repositories } = await getServerApp();
  const oauth = createOAuthService(repositories);
  try {
    const req = await oauth.validateAuthorizeRequest(params);
    const target = new URL(req.redirectUri);
    if (req.state) target.searchParams.set("state", req.state);
    if (form.get("decision") !== "approve") {
      target.searchParams.set("error", "access_denied");
      return NextResponse.redirect(target, 303);
    }
    const code = await oauth.issueCode({ clientId: req.client.clientId, redirectUri: req.redirectUri, codeChallenge: req.codeChallenge, scope: req.scope, workspaceId: ctx.workspaceId, userId: ctx.userId, resource: req.resource });
    target.searchParams.set("code", code);
    await repositories.audits
      .add({ actorType: "user", actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "oauth.authorize", targetType: "oauth_client", targetId: req.client.clientId, outcome: "success", metadata: JSON.stringify({ scope: req.scope }) })
      .catch(() => undefined);
    return NextResponse.redirect(target, 303);
  } catch (error) {
    const message = error instanceof OAuthError ? error.message : "That authorization request is not valid.";
    return NextResponse.redirect(new URL(`/oauth/authorize?error=${encodeURIComponent(message)}`, request.url), 303);
  }
}
