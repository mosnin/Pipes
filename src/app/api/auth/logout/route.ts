import { NextResponse } from "next/server";
import { getAuthService, resolveAuthMode } from "@/lib/auth";
import { getAuth } from "@/lib/auth/server";

/**
 * Sign out from a link. The session ends on the server, so a copied cookie
 * stops working too. The UI can also call Better Auth's /api/auth/sign-out.
 */
async function signOut(request: Request) {
  const mode = resolveAuthMode();
  if (mode !== "password" && mode !== "auth0") return NextResponse.redirect(new URL(getAuthService().getLogoutUrl(), request.url));
  const response = await (await getAuth()).api.signOut({ headers: request.headers, asResponse: true });
  const redirect = NextResponse.redirect(new URL(getAuthService().getLogoutUrl(), request.url));
  for (const cookie of response.headers.getSetCookie()) redirect.headers.append("set-cookie", cookie);
  return redirect;
}

export const GET = signOut;
export const POST = signOut;
