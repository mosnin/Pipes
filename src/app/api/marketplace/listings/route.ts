import { NextResponse } from "next/server";
import { safeFailure, success } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";

export async function GET() {
  try {
    const { ctx, services } = await getServerApp();
    const listings = await services.systems.getListings(ctx);
    return NextResponse.json(success(listings));
  } catch (err) {
    return NextResponse.json(safeFailure(err), { status: 400 });
  }
}
