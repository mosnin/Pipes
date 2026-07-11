"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

/**
 * ProtocolErrorReference
 *
 * Table of every SSE error code. Each row expands to show the example
 * payload. Retryable column flags whether the client should back off and
 * try again or stop and surface to the user.
 */

interface ErrorRow {
  code: string;
  description: string;
  retryable: boolean;
  example: string;
}

const ERRORS: ReadonlyArray<ErrorRow> = [
  {
    code: "tool_call_limit_exceeded",
    description: "The turn hit the 30 tool-call cap. Cut the build into smaller turns.",
    retryable: false,
    example: `event: error
data: {
  "code": "tool_call_limit_exceeded",
  "message": "Turn capped at 30 tool calls",
  "retryable": false
}`,
  },
  {
    code: "timeout",
    description: "The turn ran past the 60s wall-clock limit. The partial graph stays on the canvas.",
    retryable: false,
    example: `event: error
data: {
  "code": "timeout",
  "message": "Turn exceeded 60s wall clock",
  "retryable": false
}`,
  },
  {
    code: "auth_required",
    description: "The Bearer token is missing, expired, or revoked. Mint a new one.",
    retryable: false,
    example: `event: error
data: {
  "code": "auth_required",
  "message": "Bearer token missing or revoked",
  "retryable": false
}`,
  },
  {
    code: "rate_limited",
    description: "The token tripped the 120 calls/min ceiling. Back off and try again.",
    retryable: true,
    example: `event: error
data: {
  "code": "rate_limited",
  "message": "Rate limit reached for token",
  "retryable": true
}`,
  },
  {
    code: "model_unavailable",
    description: "The upstream model returned a transient error. Retry after a short wait.",
    retryable: true,
    example: `event: error
data: {
  "code": "model_unavailable",
  "message": "Upstream model not responding",
  "retryable": true
}`,
  },
  {
    code: "internal",
    description: "The server hit an unhandled fault. The turn is marked cancelled.",
    retryable: true,
    example: `event: error
data: {
  "code": "internal",
  "message": "Unhandled server error",
  "retryable": true
}`,
  },
];

export interface ProtocolErrorReferenceProps {
  className?: string;
}

export function ProtocolErrorReference({ className }: ProtocolErrorReferenceProps) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div
      className={["rounded-[16px] border border-black/[0.08] bg-white overflow-hidden", className ?? ""].join(" ")}
      data-testid="protocol-error-reference"
    >
      <div
        className="grid grid-cols-[1.4fr_2fr_0.7fr_28px] gap-2 px-4 py-2.5 bg-[#FAFAFA] border-b border-black/[0.06]"
        role="row"
      >
        <span className="t-overline text-[#8E8E93]">Code</span>
        <span className="t-overline text-[#8E8E93]">Description</span>
        <span className="t-overline text-[#8E8E93]">Retryable</span>
        <span />
      </div>
      <ul className="flex flex-col" role="list">
        {ERRORS.map((row) => {
          const isOpen = open === row.code;
          return (
            <li
              key={row.code}
              className="border-b border-black/[0.06] last:border-b-0"
              data-testid={`protocol-error-row-${row.code}`}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : row.code)}
                className="w-full grid grid-cols-[1.4fr_2fr_0.7fr_28px] gap-2 items-center px-4 py-3 text-left hover:bg-[#FAFAFA] transition-colors"
                aria-expanded={isOpen}
                aria-controls={`protocol-error-detail-${row.code}`}
              >
                <code
                  className="inline-flex items-center bg-[#F5F5F7] border border-black/[0.06] px-2 py-0.5 rounded-md t-mono w-fit"
                  style={{ fontSize: 11.5, color: "#991B1B" }}
                >
                  {row.code}
                </code>
                <span className="t-label text-[#3C3C43]">{row.description}</span>
                <span>
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 t-caption font-medium",
                      row.retryable
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : "border-black/[0.08] bg-[#F5F5F7] text-[#3C3C43]",
                    ].join(" ")}
                    data-retryable={row.retryable}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: row.retryable ? "#059669" : "#8E8E93" }}
                    />
                    {row.retryable ? "Yes" : "No"}
                  </span>
                </span>
                <span className="text-[#8E8E93] justify-self-end">
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              </button>
              {isOpen && (
                <div
                  id={`protocol-error-detail-${row.code}`}
                  className="px-4 pb-4"
                >
                  <pre
                    className="t-mono whitespace-pre rounded-[12px] bg-[#0F1115] text-[#E6E6E9] px-4 py-3 overflow-x-auto"
                    style={{ fontSize: 12, lineHeight: 1.6 }}
                  >
                    {row.example}
                  </pre>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
