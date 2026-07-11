import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerApp } from "@/lib/composition/server";
import { failure, safeFailure, success } from "@/lib/api/response";

type Params = { params: Promise<{ templateId: string }> };

const InstantiateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  params: z.record(z.string()).optional(),
});

export async function POST(request: Request, { params }: Params) {
  try {
    const { ctx, services } = await getServerApp();
    const raw = await request.json().catch(() => ({}));
    const parsed = InstantiateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid instantiate parameters"), { status: 422 });
    }
    const { templateId } = await params;
    return NextResponse.json(success(await services.templates.instantiate(ctx, templateId, parsed.data.name, parsed.data.params)));
  } catch (error) {
    return NextResponse.json(safeFailure(error), { status: 400 });
  }
}
