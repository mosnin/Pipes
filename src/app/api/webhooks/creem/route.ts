import { NextResponse } from "next/server";
import { createBoundedServices } from "@/domain/services/bounded";
import { WebhookRejectedError } from "@/lib/billing";
import { getRepositories } from "@/lib/composition/server";

/** Creem subscription events. Real mode requires a valid signature; anything else is rejected. */
export async function POST(request: Request) {
  try {
    const services = createBoundedServices(getRepositories());
    const ok = await services.billing.handleWebhook(request);
    return NextResponse.json({ ok });
  } catch (error) {
    if (error instanceof WebhookRejectedError) return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: "Webhook could not be processed." }, { status: 400 });
  }
}
