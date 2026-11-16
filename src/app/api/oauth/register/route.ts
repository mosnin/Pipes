import { NextResponse } from "next/server";
import { createOAuthService, OAuthError } from "@/domain/oauth/service";
import { getRepositories } from "@/lib/composition/server";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

/** RFC 7591 dynamic client registration (public clients, PKCE). */
export async function POST(request: Request) {
  try {
    const repositories = getRepositories();
    const limited = await repositories.rateLimits.consume({ bucket: `oauth-register:${request.headers.get("x-forwarded-for") ?? "local"}`, windowSeconds: 3600, limit: 30, now: new Date().toISOString() });
    if (!limited.allowed) return NextResponse.json({ error: "slow_down", error_description: "Too many registrations." }, { status: 429, headers: CORS });
    const body = await request.json();
    const client = await createOAuthService(repositories).register(body);
    return NextResponse.json(
      { client_id: client.clientId, client_name: client.clientName, redirect_uris: client.redirectUris, token_endpoint_auth_method: "none", grant_types: ["authorization_code"], response_types: ["code"], client_id_issued_at: Math.floor(Date.parse(client.createdAt) / 1000) },
      { status: 201, headers: CORS }
    );
  } catch (error) {
    const code = error instanceof OAuthError ? error.code : "invalid_client_metadata";
    return NextResponse.json({ error: code, error_description: (error as Error).message }, { status: 400, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
