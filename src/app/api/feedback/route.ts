import { z } from "zod";
import { getServerApp } from "@/lib/composition/server";
import { checkRateLimit } from "@/lib/agent/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- Hardening constants ---
// Rate limit: 60 req / 60 s per user. Feedback is cheap; this is well above
// reasonable use and only catches abuse.
// Body cap: 4 KB. Free-text is capped at 2000 chars; thumbs and NPS are tiny.
// Persistence is awaited so the row is on disk before we acknowledge.
const RATE_LIMIT_PER_MINUTE = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;
const BODY_BYTE_CAP = 4 * 1024;

const ThumbsSchema = z.object({
  kind: z.literal("thumbs"),
  targetType: z.enum(["agent_message", "agent_build_summary"]),
  targetId: z.string().min(1),
  conversationId: z.string().min(1),
  turnId: z.string().min(1),
  verdict: z.enum(["up", "down"]),
  note: z.string().max(500).optional()
});

const NpsSchema = z.object({
  kind: z.literal("nps"),
  score: z.number().int().min(0).max(10),
  note: z.string().max(2000).optional()
});

const FreeTextSchema = z.object({
  kind: z.literal("free_text"),
  surface: z.string().min(1).max(60),
  text: z.string().min(1).max(2000)
});

const FeedbackBodySchema = z.discriminatedUnion("kind", [ThumbsSchema, NpsSchema, FreeTextSchema]);

type FeedbackBody = z.infer<typeof FeedbackBodySchema>;

function jsonResponse(status: number, body: unknown, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...(headers ?? {}) }
  });
}

async function readBody(request: Request): Promise<
  | { ok: true; raw: unknown; size: number }
  | { ok: false; reason: "malformed" | "too_large"; size?: number }
> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const byteLen = new TextEncoder().encode(text).byteLength;
  if (byteLen > BODY_BYTE_CAP) {
    return { ok: false, reason: "too_large", size: byteLen };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  let canonicalSize = 0;
  try {
    canonicalSize = JSON.stringify(raw).length;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (canonicalSize > BODY_BYTE_CAP) {
    return { ok: false, reason: "too_large", size: canonicalSize };
  }
  return { ok: true, raw, size: canonicalSize };
}

export async function POST(request: Request): Promise<Response> {
  // 1. Auth via Clerk-backed getServerApp + requireUser. Middleware already
  // protects /api/* but we re-check here so a missing identity is a clean 401.
  let app: Awaited<ReturnType<typeof getServerApp>>;
  try {
    app = await getServerApp();
  } catch {
    return jsonResponse(401, { ok: false, error: "Authentication required." });
  }

  const { ctx, repositories } = app;

  // 2. Per-user rate limit (60/min sliding). Reuses the shared in-process
  // limiter; for multi-instance deploys this moves to Redis behind the same
  // pure-function API.
  const rl = checkRateLimit(`feedback:${ctx.userId}`, RATE_LIMIT_PER_MINUTE, RATE_LIMIT_WINDOW_MS);
  if (!rl.ok) {
    const retryAfterSeconds = Math.max(1, Math.ceil(rl.retryAfterMs / 1000));
    return jsonResponse(
      429,
      { ok: false, error: "rate_limited" },
      { "Retry-After": String(retryAfterSeconds) }
    );
  }

  // 3. Body cap: 4 KB.
  const bodyResult = await readBody(request);
  if (!bodyResult.ok) {
    if (bodyResult.reason === "too_large") {
      return jsonResponse(413, { ok: false, error: "payload_too_large" });
    }
    return jsonResponse(400, { ok: false, error: "Malformed JSON body." });
  }

  // 4. Zod discriminated union validation. Per-kind constraints (verdict
  // enum, score 0..10, surface/text lengths) are enforced inside the schema.
  const parsed = FeedbackBodySchema.safeParse(bodyResult.raw);
  if (!parsed.success) {
    return jsonResponse(400, {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Malformed feedback body."
    });
  }
  const body: FeedbackBody = parsed.data;

  // 5. Persist. Awaited so the entry is on disk before we acknowledge.
  try {
    if (body.kind === "thumbs") {
      await repositories.feedback.record({
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
        kind: "thumbs",
        targetType: body.targetType,
        targetId: body.targetId,
        conversationId: body.conversationId,
        turnId: body.turnId,
        verdict: body.verdict,
        note: body.note
      });
    } else if (body.kind === "nps") {
      await repositories.feedback.record({
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
        kind: "nps",
        score: body.score,
        note: body.note
      });
    } else {
      await repositories.feedback.record({
        userId: ctx.userId,
        workspaceId: ctx.workspaceId,
        kind: "free_text",
        surface: body.surface,
        text: body.text
      });
    }
  } catch (error) {
    return jsonResponse(500, { ok: false, error: (error as Error).message ?? "Persistence failed." });
  }

  return jsonResponse(200, { ok: true });
}
