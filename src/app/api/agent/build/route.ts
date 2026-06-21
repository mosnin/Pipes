import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { env, runtimeFlags } from "@/lib/env";
import { getServerApp } from "@/lib/composition/server";
import { acquireSlot, checkRateLimit, releaseSlot } from "@/lib/agent/rate-limit";
import { buildPersonalizationPayload, type PersonalizationPayload } from "@/lib/agent/personalization";
import { runOpenRouterBuild, type AgentLoopContext, type AgentLoopEvent } from "@/lib/ai/openrouter";
import { runHeuristicBuild } from "@/lib/ai/heuristic_build";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SSE_HEADERS: HeadersInit = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no"
};

const TOOL_CALL_CAP = 30;
const WALL_CLOCK_CAP_MS = 60_000;
const FIXTURES_DIR = path.join(process.cwd(), "tests", "fixtures", "agent-build");

// --- Hardening constants ---
// Rate limit: 30 requests / 60s sliding window per user.
// Body cap: 16 KB after JSON.stringify.
// Concurrency cap: 1 in-flight turn per user.
// Budget: Free=50 builds/month; Pro/Builder=unlimited (Phase 5 will rename
// these to Free/Starter/Team/Enterprise; for v1 Free maps to "Starter" 50/mo
// and any paid plan is unlimited).
//
// NOTE: rate-limit and concurrency tracking are in-memory and bound to a
// single Next.js server process. For multi-instance deploys move to Redis or
// Upstash; the API in src/lib/agent/rate-limit.ts is intentionally
// pure-function so swapping the storage is a localized change.
const RATE_LIMIT_PER_MINUTE = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;
const CONCURRENT_TURN_LIMIT = 1;
const BODY_BYTE_CAP = 16 * 1024;
const FREE_PLAN_MONTHLY_BUILDS = 50;

// Interactive plan editor: structured PlanStep accepted from the client.
// The Modal side honors plan_only (emit proposal then done) and execute_steps
// (skip planning, run the supplied steps directly).
const planStepSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["add_node", "add_pipe", "update_node", "delete_node", "validate"]),
  label: z.string().min(1),
  args: z.record(z.string(), z.unknown()),
  enabled: z.boolean().optional()
});

const buildRequestSchema = z.object({
  systemId: z.string().min(1, "systemId is required"),
  prompt: z.string().min(1, "prompt is required"),
  conversationId: z.string().min(1).optional(),
  planOnly: z.boolean().optional(),
  executeSteps: z.array(planStepSchema).optional()
});

type BuildRequestInput = z.infer<typeof buildRequestSchema>;

type FixtureFrame = {
  event: string;
  data: Record<string, unknown>;
  delay_ms?: number;
};

type ToolCallPayload = {
  id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
};

type ToolResultPayload = {
  id: string;
  ok: boolean;
  action?: Record<string, unknown>;
  error?: string;
  data?: Record<string, unknown>;
};

type ParsedEvent = { event: string; data: Record<string, unknown> } | null;

function jsonResponse(status: number, body: unknown, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...(headers ?? {}) }
  });
}

function encodeFrame(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function parseSseLine(buffer: string): { events: ParsedEvent[]; rest: string } {
  const events: ParsedEvent[] = [];
  let rest = buffer;
  while (true) {
    const sep = rest.indexOf("\n\n");
    if (sep < 0) break;
    const block = rest.slice(0, sep);
    rest = rest.slice(sep + 2);
    let eventName = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) eventName = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) {
      events.push(null);
      continue;
    }
    try {
      const data = JSON.parse(dataLines.join("\n")) as Record<string, unknown>;
      events.push({ event: eventName, data });
    } catch {
      events.push(null);
    }
  }
  return { events, rest };
}

function substituteRuntime(
  data: Record<string, unknown>,
  runtimeValues: { conversationId: string; turnId: string; systemId: string }
): Record<string, unknown> {
  const replaced: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === "<runtime>") {
      if (key === "conversationId") replaced[key] = runtimeValues.conversationId;
      else if (key === "turnId") replaced[key] = runtimeValues.turnId;
      else if (key === "systemId") replaced[key] = runtimeValues.systemId;
      else replaced[key] = value;
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      replaced[key] = substituteRuntime(value as Record<string, unknown>, runtimeValues);
    } else {
      replaced[key] = value;
    }
  }
  return replaced;
}

// Load a fixture pinned to this exact prompt (used by curated demos and tests).
// Returns null when there is no specific fixture, so the caller falls through to
// the prompt-tailored heuristic builder instead of a generic canned graph.
async function loadSpecificFixture(prompt: string): Promise<FixtureFrame[] | null> {
  const hash = crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 12);
  const candidate = path.join(FIXTURES_DIR, `${hash}.json`);
  try {
    const raw = await fs.readFile(candidate, "utf8");
    return JSON.parse(raw) as FixtureFrame[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return null;
  }
}

function isMockMode(): boolean {
  return runtimeFlags.useMocks || !runtimeFlags.hasAgentRunner;
}

function delayWithAbort(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function readBody(request: Request): Promise<{ ok: true; raw: unknown; size: number } | { ok: false; reason: "malformed" | "too_large"; size?: number }> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, reason: "malformed" };
  }
  // Body byte cap: enforce against UTF-8 byte length AND the canonical JSON
  // length so an attacker cannot pad with whitespace beyond the cap.
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

function planMonthlyLimit(plan: string): number | null {
  // Returns null for unlimited plans.
  // Free maps to the Starter cap (50/mo). Pro and Builder are unlimited.
  // TODO: when the new plan slugs ship (Free/Starter/Team/Enterprise), update
  // this map; today the schema only models Free/Pro/Builder.
  if (plan === "Free") return FREE_PLAN_MONTHLY_BUILDS;
  return null;
}

function currentMonthKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function POST(request: Request): Promise<Response> {
  // Auth: middleware enforces Clerk; inside the handler we resolve the user.
  let app: Awaited<ReturnType<typeof getServerApp>>;
  try {
    app = await getServerApp();
  } catch {
    return jsonResponse(401, { ok: false, error: "Authentication required." });
  }

  const { ctx, services, repositories, identity } = app;

  // --- Hardening gate 1: per-user rate limit (30 req / 60 s sliding) ---
  const rateLimitKey = `agent_build:${ctx.userId}`;
  const rl = checkRateLimit(rateLimitKey, RATE_LIMIT_PER_MINUTE, RATE_LIMIT_WINDOW_MS);
  if (!rl.ok) {
    const retryAfterSeconds = Math.max(1, Math.ceil(rl.retryAfterMs / 1000));
    return jsonResponse(
      429,
      { error: "rate_limited", retry_after_ms: rl.retryAfterMs },
      { "Retry-After": String(retryAfterSeconds) }
    );
  }

  // --- Hardening gate 2: body byte cap (16 KB) ---
  const bodyResult = await readBody(request);
  if (!bodyResult.ok) {
    if (bodyResult.reason === "too_large") {
      return jsonResponse(413, { error: "payload_too_large", limit: BODY_BYTE_CAP, size: bodyResult.size ?? 0 });
    }
    return jsonResponse(400, { ok: false, error: "Malformed JSON body." });
  }

  const parsed = buildRequestSchema.safeParse(bodyResult.raw);
  if (!parsed.success) {
    return jsonResponse(400, { ok: false, error: parsed.error.issues[0]?.message ?? "Malformed request." });
  }
  const body: BuildRequestInput = parsed.data;

  // Authorization: confirm the user can edit the system.
  try {
    services.access.ensureCanEdit(ctx);
  } catch {
    return jsonResponse(403, { ok: false, error: "Insufficient permissions." });
  }

  const systems = await repositories.systems.list(ctx.workspaceId);
  const system = systems.find((s) => s.id === body.systemId);
  if (!system) {
    return jsonResponse(403, { ok: false, error: "System not found in this workspace." });
  }

  // --- Hardening gate 3: per-user concurrent turn limit (1) ---
  const concurrencyKey = `agent_build:${ctx.userId}`;
  const acquired = acquireSlot(concurrencyKey, CONCURRENT_TURN_LIMIT);
  if (!acquired) {
    return jsonResponse(409, { error: "concurrent_turn_in_flight" });
  }

  // From this point we own the concurrency slot. Every exit path MUST release.
  const releaseConcurrencySlot = (() => {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      releaseSlot(concurrencyKey);
    };
  })();

  try {
    // --- Hardening gate 4: monthly build budget by plan ---
    const monthKey = currentMonthKey();
    const limit = planMonthlyLimit(ctx.plan);
    if (limit !== null) {
      let used = 0;
      try {
        const metric = await repositories.agentRunnerMetrics.getMonthly({ userId: ctx.userId, monthKey });
        used = metric?.buildsUsed ?? 0;
      } catch {
        used = 0;
      }
      if (used >= limit) {
        releaseConcurrencySlot();
        return jsonResponse(402, {
          error: "monthly_build_limit_exceeded",
          limit,
          used,
          plan: ctx.plan
        });
      }
    }

    // --- Personalization payload (Step 5) ---
    let personalization: PersonalizationPayload;
    try {
      personalization = await buildPersonalizationPayload(ctx, body.systemId, repositories, identity ?? null);
    } catch {
      personalization = {
        userFirstName: "",
        userTeam: "",
        priorSystemsSummary: "",
        systemName: system.name ?? "",
        existingNodesCount: 0,
        existingPipesCount: 0,
        feedbackHint: ""
      };
    }

    // Resolve or create the conversation. Reject foreign conversations.
    let conversationId: string;
    if (body.conversationId) {
      const existing = await repositories.agentConversations.getConversation(body.conversationId);
      if (!existing || existing.userId !== ctx.userId || existing.systemId !== body.systemId) {
        releaseConcurrencySlot();
        return jsonResponse(403, { ok: false, error: "Conversation not accessible." });
      }
      conversationId = existing.id;
      await repositories.agentConversations.touchConversation(conversationId).catch(() => undefined);
    } else {
      const conversation = await repositories.agentConversations.createConversation({ systemId: body.systemId, userId: ctx.userId });
      conversationId = conversation.id;
    }

    // Append a turn for this build.
    const existingTurns = await repositories.agentConversations.listTurns(conversationId);
    const turnIndex = existingTurns.length;
    const startedAt = new Date().toISOString();
    const turn = await repositories.agentConversations.createTurn({ conversationId, index: turnIndex, prompt: body.prompt, startedAt });

    // Fire-and-forget: increment monthly budget. Never blocks the SSE stream.
    repositories.agentRunnerMetrics
      .incrementMonthly({ userId: ctx.userId, workspaceId: ctx.workspaceId, monthKey, delta: 1 })
      .catch(() => undefined);

    // Meter the build for usage accounting (one unit per turn).
    void repositories.payments
      ?.recordUsage({ workspaceId: ctx.workspaceId, meter: "agent_build", units: 1, resourceId: "usage:agent_build" })
      ?.catch(() => undefined);

    const runtimeValues = { conversationId, turnId: turn.id, systemId: body.systemId };

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const startTime = Date.now();
        let toolCallCount = 0;
        let finalMessage: string | undefined;
        let cancelled = false;
        let closed = false;
        let upstreamController: AbortController | null = null;

        const onAbort = () => {
          cancelled = true;
          upstreamController?.abort();
        };
        request.signal.addEventListener("abort", onAbort, { once: true });

        const send = (event: string, data: unknown) => {
          if (closed) return;
          try {
            controller.enqueue(encodeFrame(event, data));
          } catch {
            // controller already closed; treat as cancelled.
            cancelled = true;
          }
        };

        const persistToolCall = (payload: ToolResultPayload, callPayload: ToolCallPayload | undefined) => {
          if (!callPayload) return;
          const record = {
            id: payload.id,
            toolName: callPayload.tool_name,
            arguments: callPayload.arguments ?? {},
            ok: payload.ok,
            action: payload.action,
            error: payload.error
          };
          repositories.agentConversations.appendToolCall({ turnId: turn.id, toolCall: record }).catch(() => undefined);
        };

        const finish = async () => {
          if (closed) return;
          closed = true;
          // Concurrency: always release the in-flight slot. Mid-stream
          // cancellation lands here via the abort listener -> finish().
          releaseConcurrencySlot();
          try {
            await repositories.agentConversations.completeTurn({
              turnId: turn.id,
              finalMessage,
              completedAt: new Date().toISOString(),
              cancelled
            });
          } catch {
            // persistence is the audit log; do not fail the response.
          }
          try {
            controller.close();
          } catch {
            // already closed
          }
        };

        const emitTerminalError = async (code: string, message: string, retryable: boolean) => {
          // Any terminal error short-circuits a successful turn; flag the turn as cancelled
          // so the persistence layer matches the spec's "incomplete turn" state.
          cancelled = true;
          send("error", { code, message, retryable });
          await finish();
        };

        const checkCaps = async (): Promise<boolean> => {
          if (Date.now() - startTime > WALL_CLOCK_CAP_MS) {
            await emitTerminalError("timeout", "Turn exceeded the 60 second wall-clock cap.", false);
            return false;
          }
          return true;
        };

        const handleToolCall = async (data: ToolCallPayload): Promise<{ allowed: boolean }> => {
          toolCallCount += 1;
          if (toolCallCount > TOOL_CALL_CAP) {
            await emitTerminalError("tool_call_limit_exceeded", "Turn exceeded the 30 tool call cap.", false);
            return { allowed: false };
          }
          return { allowed: true };
        };

        try {
          // Emit a personalization meta event so observability layers and
          // downstream tests can inspect what was forwarded. This is a
          // non-terminal event; it does not change the contract's required
          // SSE ordering invariants.
          send("meta", { personalization });

          // Resolve the current graph so a generator can extend, not duplicate.
          const loadGraphContext = async (): Promise<Pick<AgentLoopContext, "existingNodes" | "existingPipes">> => {
            try {
              const bundle = await repositories.systems.getBundle(body.systemId);
              return {
                existingNodes: bundle.nodes.map((n: { id: string; type: string; title: string }) => ({ id: n.id, type: n.type, title: n.title })),
                existingPipes: bundle.pipes
                  .map((p: { fromNodeId?: string; toNodeId?: string }) => ({ fromNodeId: p.fromNodeId ?? "", toNodeId: p.toNodeId ?? "" }))
                  .filter((p) => p.fromNodeId && p.toNodeId),
              };
            } catch {
              return { existingNodes: [], existingPipes: [] };
            }
          };

          // Shared event -> SSE mapper for both the OpenRouter loop and the
          // keyless heuristic builder. Drives the stream to a terminal state.
          const streamLoop = async (gen: AsyncGenerator<AgentLoopEvent>): Promise<void> => {
            const pendingCalls = new Map<string, ToolCallPayload>();
            try {
              for await (const ev of gen) {
                if (cancelled) break;
                if (!(await checkCaps())) return;
                if (ev.kind === "status") {
                  send("status", { state: ev.state, tool_name: ev.tool });
                } else if (ev.kind === "message") {
                  finalMessage = ev.text;
                  send("message", { role: "assistant", text: ev.text });
                } else if (ev.kind === "tool_call") {
                  const callPayload: ToolCallPayload = { id: ev.id, tool_name: ev.tool, arguments: ev.args };
                  const cap = await handleToolCall(callPayload);
                  if (!cap.allowed) return;
                  pendingCalls.set(ev.id, callPayload);
                  send("tool_call", callPayload);
                } else if (ev.kind === "tool_result") {
                  const resultPayload: ToolResultPayload = { id: ev.id, ok: ev.ok, action: ev.action as Record<string, unknown> | undefined, data: ev.data as Record<string, unknown> | undefined };
                  persistToolCall(resultPayload, pendingCalls.get(ev.id));
                  pendingCalls.delete(ev.id);
                  send("tool_result", resultPayload);
                } else if (ev.kind === "error") {
                  await emitTerminalError(ev.retryable ? "model_unavailable" : "internal", ev.message, ev.retryable);
                  return;
                }
              }
              if (!cancelled) send("done", { conversationId, turnId: turn.id });
              await finish();
            } catch (err) {
              await emitTerminalError("internal", (err as Error).message ?? "Agent build failed.", true);
            }
          };

          // Real provider: OpenRouter agentic loop. Preferred whenever an
          // OpenRouter key is configured, ahead of fixtures or the Modal
          // endpoint.
          if (runtimeFlags.hasOpenRouter && !body.planOnly && !body.executeSteps) {
            const graph = await loadGraphContext();
            await streamLoop(runOpenRouterBuild({
              systemId: body.systemId,
              prompt: body.prompt,
              systemName: personalization.systemName || system.name,
              ...graph,
            }));
            return;
          }

          if (isMockMode()) {
            const fixture = await loadSpecificFixture(body.prompt);

            // No curated fixture for this prompt: build a prompt-tailored loop
            // with the keyless heuristic builder instead of a canned graph.
            if (!fixture && !body.planOnly && !body.executeSteps) {
              const graph = await loadGraphContext();
              await streamLoop(runHeuristicBuild({
                systemId: body.systemId,
                prompt: body.prompt,
                systemName: personalization.systemName || system.name,
                ...graph,
              }));
              return;
            }

            // Curated demo / test fixture (or plan-only): replay it frame by frame.
            if (!fixture) {
              send("done", { conversationId, turnId: turn.id });
              await finish();
              return;
            }
            const pendingCalls = new Map<string, ToolCallPayload>();
            for (const frame of fixture) {
              if (cancelled) break;
              if (!(await checkCaps())) return;
              await delayWithAbort(frame.delay_ms ?? 0, request.signal);
              if (cancelled) break;

              const data = substituteRuntime(frame.data, runtimeValues);

              if (frame.event === "tool_call") {
                const callPayload = data as unknown as ToolCallPayload;
                const cap = await handleToolCall(callPayload);
                if (!cap.allowed) return;
                pendingCalls.set(callPayload.id, callPayload);
                send(frame.event, data);
              } else if (frame.event === "tool_result") {
                const resultPayload = data as unknown as ToolResultPayload;
                persistToolCall(resultPayload, pendingCalls.get(resultPayload.id));
                pendingCalls.delete(resultPayload.id);
                send(frame.event, data);
              } else if (frame.event === "message") {
                const text = typeof data.text === "string" ? data.text : "";
                if (text) finalMessage = text;
                send(frame.event, data);
              } else if (frame.event === "done") {
                send(frame.event, data);
                await finish();
                return;
              } else if (frame.event === "error") {
                send(frame.event, data);
                cancelled = true;
                await finish();
                return;
              } else {
                send(frame.event, data);
              }
            }
            if (!cancelled) {
              // Fixture missing terminal frame; close cleanly.
              send("done", { conversationId, turnId: turn.id });
            }
            await finish();
            return;
          }

          // Production mode: forward to the Modal endpoint.
          const endpoint = env.LOOPER_AGENT_ENDPOINT_URL;
          if (!endpoint) {
            await emitTerminalError("internal", "Agent endpoint not configured.", false);
            return;
          }

          upstreamController = new AbortController();
          const upstreamSignal = upstreamController.signal;

          const wallClockTimer = setTimeout(() => {
            void emitTerminalError("timeout", "Turn exceeded the 60 second wall-clock cap.", false);
            upstreamController?.abort();
          }, WALL_CLOCK_CAP_MS);

          let upstreamResponse: Response;
          try {
            upstreamResponse = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
              body: JSON.stringify({
                systemId: body.systemId,
                prompt: body.prompt,
                conversationId,
                userFirstName: personalization.userFirstName,
                userTeam: personalization.userTeam,
                priorSystemsSummary: personalization.priorSystemsSummary,
                systemName: personalization.systemName,
                existingNodesCount: personalization.existingNodesCount,
                existingPipesCount: personalization.existingPipesCount,
                // Interactive plan editor: ride-through fields that the
                // Modal builder reads to gate planning and execution.
                planOnly: body.planOnly ?? false,
                executeSteps: body.executeSteps ?? null
              }),
              signal: upstreamSignal
            });
          } catch {
            clearTimeout(wallClockTimer);
            if (!cancelled) await emitTerminalError("internal", "Agent endpoint is unreachable.", true);
            else await finish();
            return;
          }

          if (!upstreamResponse.ok || !upstreamResponse.body) {
            clearTimeout(wallClockTimer);
            await emitTerminalError("internal", `Agent endpoint returned ${upstreamResponse.status}.`, true);
            return;
          }

          const reader = upstreamResponse.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let buffer = "";
          const pendingCalls = new Map<string, ToolCallPayload>();

          try {
            while (true) {
              if (cancelled) break;
              const { value, done } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const { events, rest } = parseSseLine(buffer);
              buffer = rest;

              for (const evt of events) {
                if (!evt) continue;
                if (cancelled) break;
                if (!(await checkCaps())) {
                  clearTimeout(wallClockTimer);
                  upstreamController.abort();
                  return;
                }

                if (evt.event === "tool_call") {
                  const callPayload = evt.data as unknown as ToolCallPayload;
                  const cap = await handleToolCall(callPayload);
                  if (!cap.allowed) {
                    clearTimeout(wallClockTimer);
                    upstreamController.abort();
                    return;
                  }
                  pendingCalls.set(callPayload.id, callPayload);
                  send(evt.event, evt.data);
                } else if (evt.event === "tool_result") {
                  const resultPayload = evt.data as unknown as ToolResultPayload;
                  persistToolCall(resultPayload, pendingCalls.get(resultPayload.id));
                  pendingCalls.delete(resultPayload.id);
                  send(evt.event, evt.data);
                } else if (evt.event === "message") {
                  const text = typeof evt.data.text === "string" ? evt.data.text : "";
                  if (text) finalMessage = text;
                  send(evt.event, evt.data);
                } else if (evt.event === "done") {
                  send(evt.event, { conversationId, turnId: turn.id });
                  clearTimeout(wallClockTimer);
                  await finish();
                  return;
                } else if (evt.event === "error") {
                  send(evt.event, evt.data);
                  cancelled = true;
                  clearTimeout(wallClockTimer);
                  await finish();
                  return;
                } else {
                  send(evt.event, evt.data);
                }
              }
            }
          } catch {
            // upstream abort or read error; treat as cancelled if user disconnected.
          } finally {
            clearTimeout(wallClockTimer);
            try { reader.releaseLock(); } catch { /* noop */ }
          }

          await finish();
        } catch (error) {
          if (!closed) {
            send("error", { code: "internal", message: (error as Error).message ?? "Internal error.", retryable: false });
            await finish();
          }
        }
      },
      cancel() {
        // Reader disconnected; abort upstream is handled by request.signal listener.
        // The finish() path releases the concurrency slot.
      }
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (error) {
    // Defensive: any synchronous throw before the stream is wired must release
    // the concurrency slot so the user is not locked out for a turn.
    releaseConcurrencySlot();
    return jsonResponse(500, { ok: false, error: (error as Error).message ?? "Internal error." });
  }
}
