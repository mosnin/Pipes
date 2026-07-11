import { NextResponse } from "next/server";
import { z } from "zod";
import { success, failure } from "@/lib/api/response";
import { subscribe } from "@/lib/newsletter/store";

const Body = z.object({
  email: z.string().trim().email().max(254),
});

export async function POST(request: Request) {
  let parsed: { email: string };
  try {
    const json = await request.json();
    const result = Body.safeParse(json);
    if (!result.success) {
      return NextResponse.json(failure("invalid_email"), { status: 400 });
    }
    parsed = result.data;
  } catch {
    return NextResponse.json(failure("invalid_payload"), { status: 400 });
  }

  const result = subscribe(parsed.email);
  return NextResponse.json(success({ ok: true, result }), { status: 200 });
}
