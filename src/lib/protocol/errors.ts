export type ProtocolErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_INVALID"
  | "PERMISSION_DENIED"
  | "SCOPE_VIOLATION"
  | "VALIDATION_ERROR"
  | "PLAN_LIMIT"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class ProtocolError extends Error {
  constructor(
    public readonly code: ProtocolErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
  }
}

export function mapProtocolError(error: unknown): ProtocolError {
  if (error instanceof ProtocolError) return error;
  const message = (error as Error)?.message ?? "Unexpected protocol error.";
  if (message.includes("Invalid protocol token")) return new ProtocolError("AUTH_INVALID", "Invalid token.", 401);
  if (message.includes("Insufficient permissions")) return new ProtocolError("PERMISSION_DENIED", "Insufficient permissions.", 403);
  if (message.includes("scoped to another system")) return new ProtocolError("SCOPE_VIOLATION", "Token scope violation.", 403);
  if (message.includes("Plan limit reached") || message.includes("Plan does not include")) return new ProtocolError("PLAN_LIMIT", "Plan limit reached.", 402);
  if (message.includes("not found") || message.includes("not Found")) return new ProtocolError("NOT_FOUND", "Resource not found.", 404);
  if (message.includes("already exists") || message.includes("conflict")) return new ProtocolError("CONFLICT", "Conflict.", 409);
  if (message.includes("JSON") || message.includes("Missing") || message.includes("Invalid")) return new ProtocolError("VALIDATION_ERROR", "Invalid request payload.", 400);
  return new ProtocolError("INTERNAL_ERROR", "Protocol request failed.", 500);
}

export function restErrorResponse(error: unknown, requestId: string) {
  const mapped = mapProtocolError(error);
  return {
    ok: false as const,
    error: {
      code: mapped.code,
      message: mapped.message,
      requestId,
      details: mapped.details
    }
  };
}

export function mcpErrorPayload(error: unknown, requestId: string) {
  const mapped = mapProtocolError(error);
  return {
    ok: false as const,
    error: {
      code: mapped.code,
      message: mapped.message,
      requestId,
      details: mapped.details
    }
  };
}
