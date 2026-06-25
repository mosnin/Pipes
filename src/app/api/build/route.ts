import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { planDag, DagPlanRequestSchema } from "@/lib/ai/dag_planner";

export async function POST(request: Request) {
  try {
    await getServerApp();
    const body = await request.json();
    const req = DagPlanRequestSchema.parse(body);
    const dag = await planDag(req);
    return NextResponse.json(success(dag));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
