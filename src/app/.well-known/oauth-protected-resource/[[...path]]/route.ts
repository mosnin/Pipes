import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/oauth/base-url";
import { OAUTH_SCOPES } from "@/domain/oauth/service";

/** RFC 9728 protected resource metadata for the Pipes MCP server. */
export async function GET(request: Request) {
  const origin = publicOrigin(request);
  return NextResponse.json(
    { resource: `${origin}/api/mcp`, authorization_servers: [origin], scopes_supported: Object.keys(OAUTH_SCOPES), bearer_methods_supported: ["header"], resource_name: "Pipes" },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}
