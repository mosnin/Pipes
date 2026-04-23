import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";

export async function GET() {
  try {
    const { ctx, services } = await getServerApp();
    return NextResponse.json(success(await services.governance.getTrustSettings(ctx)));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    if (body.section === "auth") return NextResponse.json(success(await services.governance.updateEnterpriseAuth(ctx, body.payload)));
    if (body.section === "retention") return NextResponse.json(success(await services.governance.updateRetentionPolicy(ctx, body.payload)));
    return NextResponse.json(failure("Unsupported section"), { status: 400 });
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const body = await request.json();
    if (body.action === "deactivate") return NextResponse.json(success(await services.governance.deactivateWorkspace(ctx, String(body.reason ?? ""), String(body.confirmation ?? ""))));
    if (body.action === "reactivate") return NextResponse.json(success(await services.governance.reactivateWorkspace(ctx)));
    return NextResponse.json(failure("Unsupported action"), { status: 400 });
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
