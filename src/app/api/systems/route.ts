import { NextResponse } from "next/server";
import { z } from "zod";
import { failure, success } from "@/lib/api/response";
import { getServerApp } from "@/lib/composition/server";

const CreateSystemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const raw = await request.json();
    const parsed = CreateSystemSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid system parameters"), { status: 422 });
    }
    const systemId = await services.systems.create(ctx, parsed.data);
    return NextResponse.json(success({ systemId }));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
