import { NextResponse } from "next/server";
import { getRepositories } from "@/lib/composition/server";

type Params = { params: Promise<{ token: string }> };

/**
 * Check an invite before anyone tries to accept it. Open to anyone holding the
 * link, so it answers with the invite's state, the address it was sent to and
 * the role it grants, and nothing about the workspace behind it.
 */
export async function GET(_: Request, { params }: Params) {
  try {
    const { token } = await params;
    const invite = token ? await getRepositories().invites.getByToken(token) : null;
    if (!invite) return NextResponse.json({ ok: false, error: "invite_not_found", message: "This invite is not valid." }, { status: 404 });
    const expired = invite.status === "pending" && new Date(invite.expiresAt).getTime() < Date.now();
    const status = expired ? "expired" : invite.status;
    return NextResponse.json({ ok: true, data: { status, valid: status === "pending", email: invite.email, role: invite.role, expiresAt: invite.expiresAt } });
  } catch {
    return NextResponse.json({ ok: false, error: "invite_lookup_failed", message: "This invite could not be checked. Try again." }, { status: 400 });
  }
}
