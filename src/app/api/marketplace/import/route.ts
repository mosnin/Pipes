import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";

// Maps marketplace listing IDs → starter template IDs from the catalog.
// Falls back to a category-based default when no exact match exists.
const LISTING_TO_TEMPLATE: Record<string, string> = {
  "deep-research-loop": "multi-agent-research",
  "support-triage-loop": "customer-support-triage",
  "code-review-loop": "code-review-assistant",
  "sales-outreach-loop": "automation-workflow",
  "data-pipeline-loop": "automation-workflow",
  "content-gen-loop": "multi-agent-handoff",
  "security-scan-loop": "code-review-assistant",
  "devops-deploy-loop": "automation-workflow",
};

const CATEGORY_TO_TEMPLATE: Record<string, string> = {
  Research: "multi-agent-research",
  Support: "customer-support-triage",
  Code: "code-review-assistant",
  Sales: "automation-workflow",
  Data: "automation-workflow",
  Content: "multi-agent-handoff",
  Security: "code-review-assistant",
  DevOps: "automation-workflow",
};

export async function POST(req: Request) {
  const { services, ctx } = await getServerApp();
  const { listingId, name, category } = await req.json() as { listingId: string; name: string; category?: string };
  try {
    const templateId =
      LISTING_TO_TEMPLATE[listingId] ??
      (category ? CATEGORY_TO_TEMPLATE[category] : null) ??
      "multi-agent-handoff";

    // Instantiate the matching starter template so the user gets a real loop,
    // not a blank canvas.
    const systemId = await services.templates.instantiate(ctx, templateId, `${name} (from marketplace)`);
    return NextResponse.json({ ok: true, data: { systemId } });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }
}
