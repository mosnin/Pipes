import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/oauth/base-url";
import { OAUTH_SCOPES } from "@/domain/oauth/service";

/** RFC 8414 authorization server metadata. */
export async function GET(request: Request) {
  const origin = publicOrigin(request);
  return NextResponse.json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/oauth/authorize`,
      token_endpoint: `${origin}/api/oauth/token`,
      registration_endpoint: `${origin}/api/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: Object.keys(OAUTH_SCOPES)
    },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}
