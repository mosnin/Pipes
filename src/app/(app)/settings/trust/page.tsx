"use client";

import { ExternalLink, ShieldCheck } from "lucide-react";
import {
  CardShell,
  CardHeader,
  CardBody,
  PageHeader,
  StatusBadge,
} from "@/components/ui";

export default function TrustPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Trust and security"
        subtitle="Security posture, token policies, and data handling for your workspace."
      />

      <CardShell>
        <CardHeader>Authentication</CardHeader>
        <CardBody>
          <div className="flex flex-col divide-y divide-black/[0.06]">
            {[
              {
                label: "Sign-in provider",
                value: "Clerk (email + OAuth)",
                tone: "success" as const,
              },
              {
                label: "Session duration",
                value: "7 days (rolling)",
                tone: "neutral" as const,
              },
              {
                label: "MCP token hashing",
                value: "SHA-256 (one-way)",
                tone: "success" as const,
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 py-3">
                <p className="t-label text-ink-1">{item.label}</p>
                <StatusBadge tone={item.tone}>{item.value}</StatusBadge>
              </div>
            ))}
          </div>
        </CardBody>
      </CardShell>

      <CardShell>
        <CardHeader>MCP token security</CardHeader>
        <CardBody>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
              <ShieldCheck size={16} className="text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="t-label font-medium text-indigo-900">Tokens are hashed at rest</p>
                <p className="t-caption text-indigo-700">
                  Your MCP token values are only shown once on creation. Only a SHA-256 hash is
                  stored in the database. If you lose a token, revoke it and generate a new one.
                </p>
              </div>
            </div>
            <div className="flex flex-col divide-y divide-black/[0.06]">
              {[
                { label: "Token prefix", value: "ptk_" },
                { label: "Token entropy", value: "256 bits" },
                { label: "Revocation", value: "Instant (delete from Settings > Tokens)" },
                { label: "Scope", value: "Per-workspace" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4 py-3">
                  <p className="t-label text-ink-1">{item.label}</p>
                  <p className="t-label font-mono text-ink-2 text-[11px]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </CardShell>

      <CardShell>
        <CardHeader>Data handling</CardHeader>
        <CardBody>
          <div className="flex flex-col divide-y divide-black/[0.06]">
            {[
              {
                label: "Loop schema storage",
                value: "Convex (US East, encrypted at rest)",
              },
              {
                label: "AI prompt data",
                value: "Sent to OpenAI. Not stored by Pipes beyond session.",
              },
              {
                label: "Audit log retention",
                value: "90 days (Builder plan and above)",
              },
              {
                label: "GDPR",
                value: "Contact support to request data export or deletion.",
              },
            ].map((item) => (
              <div key={item.label} className="flex items-start justify-between gap-4 py-3">
                <p className="t-label text-ink-1 shrink-0">{item.label}</p>
                <p className="t-caption text-ink-2 text-right">{item.value}</p>
              </div>
            ))}
          </div>
          <a
            href="https://pipes.dev/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 t-caption text-indigo-600 hover:text-indigo-700 mt-4"
          >
            Privacy policy
            <ExternalLink size={12} />
          </a>
        </CardBody>
      </CardShell>
    </div>
  );
}
