// SSE client for /api/agent/build. Hand-rolls the parse loop because EventSource
// does not allow POST bodies. The server framing is `event: <name>\ndata: <json>\n\n`.

import type {
  AgentBuildRequest,
  AgentEvent,
  DoneEvent,
  ErrorEvent,
  MessageEvent,
  StatusEvent,
  ToolCallEvent,
  ToolResultEvent,
} from "@/lib/agent/types";

export type AgentEventHandler = (event: AgentEvent) => void;

export type StartAgentBuildOptions = {
  request: AgentBuildRequest;
  onEvent: AgentEventHandler;
  signal?: AbortSignal;
  endpoint?: string;
};

const KNOWN_EVENT_NAMES = new Set([
  "tool_call",
  "tool_result",
  "message",
  "status",
  "done",
  "error",
]);

// Parse a single decoded `event: ... data: ...` block into a typed AgentEvent.
function parseFrame(frame: string): AgentEvent | null {
  let eventName = "message";
  const dataLines: string[] = [];
  for (const rawLine of frame.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line) continue;
    if (line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
      continue;
    }
  }
  if (!KNOWN_EVENT_NAMES.has(eventName)) return null;
  if (dataLines.length === 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(dataLines.join("\n"));
  } catch {
    return null;
  }
  switch (eventName) {
    case "tool_call":
      return { type: "tool_call", data: parsed as ToolCallEvent };
    case "tool_result":
      return { type: "tool_result", data: parsed as ToolResultEvent };
    case "message":
      return { type: "message", data: parsed as MessageEvent };
    case "status":
      return { type: "status", data: parsed as StatusEvent };
    case "done":
      return { type: "done", data: parsed as DoneEvent };
    case "error":
      return { type: "error", data: parsed as ErrorEvent };
    default:
      return null;
  }
}

// Streams SSE from the build route. Resolves when the stream ends; rejects on
// network failure. Caller-provided signal cancels the in-flight fetch.
export async function startAgentBuild(options: StartAgentBuildOptions): Promise<void> {
  const endpoint = options.endpoint ?? "/api/agent/build";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify(options.request),
    signal: options.signal,
    cache: "no-store",
  });

  if (!response.ok || !response.body) {
    options.onEvent({
      type: "error",
      data: {
        code: response.status === 401 ? "auth_required" : "internal",
        message: `Build failed: ${response.status} ${response.statusText}`,
        retryable: response.status >= 500,
      },
    });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const parsed = parseFrame(frame);
      if (parsed) options.onEvent(parsed);
      boundary = buffer.indexOf("\n\n");
    }
  }

  // Drain any trailing frame that may not have ended in a blank line.
  const tail = buffer.trim();
  if (tail.length > 0) {
    const parsed = parseFrame(tail);
    if (parsed) options.onEvent(parsed);
  }
}
