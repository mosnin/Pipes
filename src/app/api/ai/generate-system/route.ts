import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { AiSystemDraftSchema } from "@/lib/ai/index";

const GenerateRequestSchema = z.object({
  prompt: z.string().min(1).max(4000),
  systemName: z.string().max(200).optional(),
  domain: z.string().max(200).optional(),
  complexity: z.enum(["simple", "standard", "advanced"]).optional(),
  stackPreferences: z.array(z.string().max(100)).max(10).optional(),
  targetOutcome: z.string().max(1000).optional(),
});

const CommitRequestSchema = z.object({
  commit: z.literal(true),
  draft: AiSystemDraftSchema,
});

const RequestBodySchema = z.union([CommitRequestSchema, GenerateRequestSchema]);

export async function POST(request: Request) {
  try {
    const { ctx, services } = await getServerApp();
    const raw = await request.json();

    if (raw?.commit === true) {
      const parsed = CommitRequestSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json(failure("Invalid draft commit payload"), { status: 422 });
      }
      return NextResponse.json(success(await services.ai.commitDraft(ctx, parsed.data.draft)));
    }

    const parsed = GenerateRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(failure("Invalid generate request"), { status: 422 });
    }
    return NextResponse.json(success(await services.ai.generateDraft(ctx, parsed.data)));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
