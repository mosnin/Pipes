import { NextResponse } from "next/server";
import { z } from "zod";
import { success, failure } from "@/lib/api/response";

/**
 * /api/newsletter
 *
 * Placeholder. Validates the request body with Zod, then no-ops. We do
 * not currently persist subscribers — this is a visual capture surface.
 * When we wire a real backend, swap the no-op for a call into a
 * NewsletterService bound through `getServerApp()`.
 */

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

  // No-op. The placeholder route exists so the client form has a real
  // endpoint to hit during dev. The email is deliberately discarded.
  void parsed.email;

  return NextResponse.json(success({ ok: true }), { status: 200 });
}
