import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";

export async function GET() {
  const { services } = await getServerApp();
  return NextResponse.json({ ok: true, data: services.templates.list() });
}
