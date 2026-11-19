import { NextResponse } from "next/server";
import { AccessDenied } from "@/domain/permissions";

/**
 * An error that knows its HTTP status. Thrown where a request cannot go on
 * (not signed in, blocked by the workspace's security policy) and turned
 * into a response by `apiError`, whatever route it happens in.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly extra: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

/**
 * The response for an error caught in a route handler: 401 or 403 with a
 * code for auth and policy refusals, 403 for the permission table, and
 * `fallback` (400 unless the route says otherwise) for everything else.
 */
export function apiError(error: unknown, fallback = 400) {
  if (error instanceof HttpError) return NextResponse.json({ ok: false, error: error.message, code: error.code, ...error.extra }, { status: error.status });
  if (error instanceof AccessDenied) return NextResponse.json({ ok: false, error: error.message, code: error.code, permission: error.permission }, { status: 403 });
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Something went wrong." }, { status: fallback });
}

/** Set by src/proxy.ts on every /api request, so server code can tell an API call from a page render. */
export const API_SURFACE_HEADER = "x-pipes-surface";
