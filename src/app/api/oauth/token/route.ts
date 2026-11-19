import { NextResponse } from "next/server";
import { createOAuthService, OAuthError } from "@/domain/oauth/service";
import { getRepositories } from "@/lib/composition/server";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, authorization", "Access-Control-Allow-Methods": "POST, OPTIONS" };

async function readParams(request: Request): Promise<URLSearchParams> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return new URLSearchParams(Object.entries(await request.json()).map(([k, v]) => [k, String(v)]));
  return new URLSearchParams(await request.text());
}

export async function POST(request: Request) {
  try {
    const params = await readParams(request);
    if (params.get("grant_type") !== "authorization_code") throw new OAuthError("unsupported_grant_type", "Only authorization_code is supported.");
    const token = await createOAuthService(getRepositories()).exchangeCode({
      code: params.get("code") ?? "",
      clientId: params.get("client_id") ?? "",
      redirectUri: params.get("redirect_uri") ?? "",
      codeVerifier: params.get("code_verifier") ?? ""
    });
    return NextResponse.json(token, { headers: { ...CORS, "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof OAuthError ? error.code : "invalid_request";
    return NextResponse.json({ error: code, error_description: (error as Error).message }, { status: 400, headers: CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}
