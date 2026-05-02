import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { env, runtimeFlags } from "@/lib/env";
import { getServerApp } from "@/lib/composition/server";

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

const buildRequestSchema = z.object({
  systemId: z.string().min(1, "systemId is required"),
  prompt: z.string().min(1, "prompt is required"),
  conversationId: z.string().min(1).optional()
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

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
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

async function loadFixture(prompt: string): Promise<FixtureFrame[]> {
  const hash = crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 12);
  const candidate = path.join(FIXTURES_DIR, `${hash}.json`);
  const fallback = path.join(FIXTURES_DIR, "_default.json");
  for (const file of [candidate, fallback]) {
    try {
      const raw = await fs.readFile(file, "utf8");
      return JSON.parse(raw) as FixtureFrame[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  throw new Error("Default agent build fixture is missing.");
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

async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<Response> {
  // Auth: middleware enforces Clerk; inside the handler we resolve the user.
  let app: Awaited<ReturnType<typeof getServerApp>>;
  try {
    app = await getServerApp();
  } catch {
    return jsonResponse(401, { ok: false, error: "Authentication required." });
  }

  const { ctx, services, repositories } = app;

  const raw = await readBody(request);
  const parsed = buildRequestSchema.safeParse(raw);
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

  // Resolve or create the conversation. Reject foreign conversations.
  let conversationId: string;
  if (body.conversationId) {
    const existing = await repositories.agentConversations.getConversation(body.conversationId);
    if (!existing || existing.userId !== ctx.userId || existing.systemId !== body.systemId) {
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
        if (isMockMode()) {
          const fixture = await loadFixture(body.prompt);
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
        const endpoint = env.PIPES_AGENT_ENDPOINT_URL;
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
            body: JSON.stringify({ systemId: body.systemId, prompt: body.prompt, conversationId }),
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
    }
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
