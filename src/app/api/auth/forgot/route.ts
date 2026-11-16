import { NextResponse } from "next/server";
import { createAccountService } from "@/domain/services/accounts";
import { getRepositories } from "@/lib/composition/server";
import { getEmailService } from "@/lib/email";
import { env } from "@/lib/env";

/** Email a password reset link: { email }. Always answers the same way, so it never reveals who has an account. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "");
  try {
    const issued = await createAccountService(getRepositories()).requestReset(email);
    if (issued.token) {
      const resetUrl = new URL("/reset-password", env.NEXT_PUBLIC_APP_URL);
      resetUrl.searchParams.set("token", issued.token);
      await getEmailService().sendPasswordReset({ email: issued.email, name: issued.name, resetUrl: resetUrl.toString() });
    }
  } catch {
    // Same answer regardless, by design.
  }
  return NextResponse.json({ ok: true, data: { message: "If that email has a Pipes account, a reset link is on its way." } });
}
