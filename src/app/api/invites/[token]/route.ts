import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { success, failure } from "@/lib/api/response";

type Params = { params: Promise<{ token: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    const { token } = await params;
    const { repositories } = await getServerApp();
    const invite = await repositories.invites.getByToken(token);
    if (!invite) {
      return NextResponse.json(failure("Invite not found"), { status: 404 });
    }

    const workspace = await repositories.workspaces.get(invite.workspaceId);
    const workspaceName = workspace?.name ?? "a workspace";

    return NextResponse.json(
      success({ workspaceName, role: invite.role, email: invite.email }),
    );
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
