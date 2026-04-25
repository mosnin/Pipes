"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  Button,
  Chip,
  Separator,
  Modal,
  ModalBackdrop,
  ModalContainer,
  ModalDialog,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
} from "@heroui/react";
import { Shield, Download, AlertTriangle, Lock } from "lucide-react";
import { SettingsShell } from "@/components/settings/SettingsShell";

// ── types ──────────────────────────────────────────────────────────────────

interface TrustData {
  auth: {
    mode: string;
    allowedDomains?: string[];
    auth0Connection?: string;
  };
  retention: {
    archivedSystemRetentionDays?: number;
    inviteExpiryDays?: number;
    staleTokenDays?: number;
    auditRetentionDays?: number;
  };
  workspaceState: {
    state: string;
  };
}

interface AgentPolicy {
  scope?: string;
  risk?: {
    posture?: string;
    safeAutoApplyEnabled?: boolean;
    maxProposalBatchSize?: number;
  };
  approval?: {
    strictness?: string;
  };
  tool?: {
    allowedTools?: string[];
  };
  cost?: {
    maxRunCostUsd?: number;
  };
  runtime?: {
    maxRunDurationMs?: number;
    maxProviderCallsPerRun?: number;
  };
}

// ── retention defaults (display-only fallbacks) ────────────────────────────

const RETENTION_DEFAULTS = [
  { label: "Archived systems", key: "archivedSystemRetentionDays", fallback: 365 },
  { label: "Invites", key: "inviteExpiryDays", fallback: 7 },
  { label: "Stale tokens", key: "staleTokenDays", fallback: 90 },
  { label: "Audit log", key: "auditRetentionDays", fallback: 365 },
] as const;

// ── page ───────────────────────────────────────────────────────────────────

export default function TrustSettingsPage() {
  // ── trust data state ──
  const [data, setData] = useState<TrustData | null>(null);

  // ── auth section state ──
  const [mode, setMode] = useState("shared");
  const [allowedDomains, setAllowedDomains] = useState("");
  const [auth0Connection, setAuth0Connection] = useState("");
  const [authSaving, setAuthSaving] = useState(false);

  // ── agent policy state ──
  const [policy, setPolicy] = useState<AgentPolicy | null>(null);
  const [riskPosture, setRiskPosture] = useState("balanced");
  const [approvalStrictness, setApprovalStrictness] = useState("standard");
  const [allowedTools, setAllowedTools] = useState("");
  const [maxCostUsd, setMaxCostUsd] = useState("");
  const [policySaving, setPolicySaving] = useState(false);

  // ── workspace export state ──
  const [exportManifest, setExportManifest] = useState<unknown>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // ── workspace lifecycle state ──
  const [deactivateReason, setDeactivateReason] = useState("Security review pending");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [lifecycleSaving, setLifecycleSaving] = useState(false);

  // ── modal for deactivation confirmation ──
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  // ── data loading ──────────────────────────────────────────────────────────

  const loadTrust = useCallback(async () => {
    const res = await fetch("/api/settings/trust");
    const body = await res.json();
    if (!body.ok) return;
    const d: TrustData = body.data;
    setData(d);
    setAllowedDomains((d.auth.allowedDomains ?? []).join(","));
    setAuth0Connection(d.auth.auth0Connection ?? "");
    setMode(d.auth.mode ?? "shared");
  }, []);

  const loadPolicy = useCallback(async () => {
    const res = await fetch("/api/agent/policy");
    const body = await res.json();
    if (!body.ok) return;
    const p: AgentPolicy = body.data;
    setPolicy(p);
    setRiskPosture(p.risk?.posture ?? "balanced");
    setApprovalStrictness(p.approval?.strictness ?? "standard");
    setAllowedTools((p.tool?.allowedTools ?? []).join(", "));
    setMaxCostUsd(String(p.cost?.maxRunCostUsd ?? ""));
  }, []);

  useEffect(() => {
    void loadTrust();
    void loadPolicy();
  }, [loadTrust, loadPolicy]);

  // ── save handlers ─────────────────────────────────────────────────────────

  const saveAuth = async () => {
    setAuthSaving(true);
    try {
      await fetch("/api/settings/trust", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          section: "auth",
          payload: {
            mode,
            allowedDomains: allowedDomains
              .split(",")
              .map((d) => d.trim())
              .filter(Boolean),
            auth0Connection: auth0Connection || undefined,
            enforceDomainMatch: mode === "sso_ready",
          },
        }),
      });
      await loadTrust();
    } finally {
      setAuthSaving(false);
    }
  };

  const savePolicy = async () => {
    if (!policy) return;
    setPolicySaving(true);
    try {
      const parsedTools = allowedTools
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const parsedCost = parseFloat(maxCostUsd) || policy.cost?.maxRunCostUsd || 0;
      const payload: AgentPolicy = {
        ...policy,
        scope: "workspace",
        risk: {
          ...policy.risk,
          posture: riskPosture,
          safeAutoApplyEnabled: riskPosture !== "conservative",
          maxProposalBatchSize:
            riskPosture === "conservative" ? 2 : riskPosture === "aggressive" ? 8 : 5,
        },
        approval: { ...policy.approval, strictness: approvalStrictness },
        tool: { ...policy.tool, allowedTools: parsedTools },
        cost: { ...policy.cost, maxRunCostUsd: parsedCost },
      };
      await fetch("/api/agent/policy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      await loadPolicy();
    } finally {
      setPolicySaving(false);
    }
  };

  const generateExport = async () => {
    setExportLoading(true);
    try {
      const res = await fetch("/api/settings/export/workspace", { method: "POST" });
      const body = await res.json();
      if (body.ok) setExportManifest(body.data);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeactivateConfirm = async () => {
    if (confirmPhrase !== "DEACTIVATE") return;
    setLifecycleSaving(true);
    try {
      await fetch("/api/settings/trust", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "deactivate",
          reason: deactivateReason,
          confirmation: confirmPhrase,
        }),
      });
      await loadTrust();
    } finally {
      setLifecycleSaving(false);
      setDeactivateOpen(false);
      setConfirmPhrase("");
    }
  };

  const handleReactivate = async () => {
    setLifecycleSaving(true);
    try {
      await fetch("/api/settings/trust", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reactivate" }),
      });
      await loadTrust();
    } finally {
      setLifecycleSaving(false);
    }
  };

  // ── derived values ────────────────────────────────────────────────────────

  const workspaceState = data?.workspaceState?.state ?? "active";
  const isActive = workspaceState === "active";

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <SettingsShell>
      <div className="mx-auto max-w-3xl space-y-8 p-6">

        {/* ── Page header ── */}
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-default-500 shrink-0" />
          <h1 className="text-2xl font-bold">Trust &amp; Governance</h1>
        </div>

        {/* ── 1. Enterprise Authentication ── */}
        <Card className="shadow-sm">
          <Card.Header className="pb-0">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-default-500 shrink-0" />
              <h2 className="text-base font-semibold">Enterprise Authentication</h2>
            </div>
          </Card.Header>
          <Card.Content className="space-y-4 pt-3">
            <p className="text-sm text-default-500">
              <code className="text-xs bg-default-100 px-1 py-0.5 rounded">sso_ready</code> mode
              prepares domain and connection metadata; full SSO provisioning remains an Auth0 tenant operation.
            </p>

            <div className="flex flex-col gap-1 max-w-xs">
              <label htmlFor="auth-mode" className="text-sm font-medium text-default-700">
                Auth mode
              </label>
              <select
                id="auth-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="rounded-lg border border-default-200 bg-white px-3 py-2 text-sm text-default-800 shadow-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              >
                <option value="shared">shared</option>
                <option value="sso_ready">sso_ready</option>
              </select>
            </div>

            {mode === "sso_ready" && (
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="allowed-domains" className="text-sm font-medium text-default-700">
                    Allowed domains
                  </label>
                  <input
                    id="allowed-domains"
                    type="text"
                    placeholder="acme.com, corp.example.com"
                    value={allowedDomains}
                    onChange={(e) => setAllowedDomains(e.target.value)}
                    className="rounded-lg border border-default-200 bg-white px-3 py-2 text-sm text-default-800 shadow-sm outline-none placeholder:text-default-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />
                  <p className="text-xs text-default-400">Comma-separated list of permitted email domains</p>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="auth0-connection" className="text-sm font-medium text-default-700">
                    Auth0 connection
                  </label>
                  <input
                    id="auth0-connection"
                    type="text"
                    placeholder="acme-saml"
                    value={auth0Connection}
                    onChange={(e) => setAuth0Connection(e.target.value)}
                    className="rounded-lg border border-default-200 bg-white px-3 py-2 text-sm text-default-800 shadow-sm outline-none placeholder:text-default-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />
                  <p className="text-xs text-default-400">Required for sso_ready mode</p>
                </div>
              </div>
            )}

            <div className="pt-1">
              <Button
                variant="primary"
                size="sm"
                isDisabled={authSaving}
                onPress={saveAuth}
                className="flex items-center gap-1.5"
              >
                {authSaving && <Spinner size="sm" />}
                Save auth settings
              </Button>
            </div>
          </Card.Content>
        </Card>

        {/* ── 2. Data Retention ── */}
        <Card className="shadow-sm">
          <Card.Header className="pb-0">
            <h2 className="text-base font-semibold">Data Retention</h2>
          </Card.Header>
          <Card.Content className="pt-3">
            <p className="text-sm text-default-500 mb-4">
              Default retention windows for workspace data. Contact support to adjust limits.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-default-400 border-b border-default-100">
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium text-right">Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default-100">
                {RETENTION_DEFAULTS.map(({ label, key, fallback }) => {
                  const val =
                    (data?.retention as Record<string, number | undefined>)?.[key] ?? fallback;
                  return (
                    <tr key={key}>
                      <td className="py-2.5 text-foreground">{label}</td>
                      <td className="py-2.5 text-right">
                        <Chip size="sm" variant="soft" color="default">
                          {val}d
                        </Chip>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card.Content>
        </Card>

        {/* ── 3. Agent Policy ── */}
        <Card className="shadow-sm">
          <Card.Header className="pb-0">
            <h2 className="text-base font-semibold">Agent Policy</h2>
          </Card.Header>
          <Card.Content className="space-y-5 pt-3">
            <p className="text-sm text-default-500">
              Configure workspace-level risk posture, approval gates, and tool boundaries for agent runs.
            </p>

            <div>
              <p className="text-sm font-medium mb-2">Risk posture</p>
              <div className="flex gap-4">
                {(["conservative", "balanced", "aggressive"] as const).map((val) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="risk-posture"
                      value={val}
                      checked={riskPosture === val}
                      onChange={() => setRiskPosture(val)}
                      className="accent-primary-500"
                    />
                    <span className="capitalize">{val}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1 max-w-xs">
              <label htmlFor="approval-strictness" className="text-sm font-medium text-default-700">
                Approval strictness
              </label>
              <select
                id="approval-strictness"
                value={approvalStrictness}
                onChange={(e) => setApprovalStrictness(e.target.value)}
                className="rounded-lg border border-default-200 bg-white px-3 py-2 text-sm text-default-800 shadow-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              >
                <option value="strict">strict</option>
                <option value="standard">standard</option>
                <option value="relaxed">relaxed</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="allowed-tools" className="text-sm font-medium text-default-700">
                Allowed tools
              </label>
              <input
                id="allowed-tools"
                type="text"
                placeholder="read_file, search, run_query"
                value={allowedTools}
                onChange={(e) => setAllowedTools(e.target.value)}
                className="rounded-lg border border-default-200 bg-white px-3 py-2 text-sm text-default-800 shadow-sm outline-none placeholder:text-default-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
              <p className="text-xs text-default-400">Comma-separated list of permitted tool names</p>
            </div>

            <div className="flex flex-col gap-1 max-w-xs">
              <label htmlFor="max-cost" className="text-sm font-medium text-default-700">
                Max cost per run (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-default-400 text-sm pointer-events-none">$</span>
                <input
                  id="max-cost"
                  type="number"
                  placeholder="0.50"
                  min={0}
                  step={0.01}
                  value={maxCostUsd}
                  onChange={(e) => setMaxCostUsd(e.target.value)}
                  className="w-full rounded-lg border border-default-200 bg-white pl-7 pr-3 py-2 text-sm text-default-800 shadow-sm outline-none placeholder:text-default-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </div>

            <div className="pt-1">
              <Button
                variant="primary"
                size="sm"
                isDisabled={policySaving || !policy}
                onPress={savePolicy}
                className="flex items-center gap-1.5"
              >
                {policySaving && <Spinner size="sm" />}
                Save agent policy
              </Button>
            </div>
          </Card.Content>
        </Card>

        {/* ── 4. Workspace Export ── */}
        <Card className="shadow-sm">
          <Card.Header className="pb-0">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-default-500 shrink-0" />
              <h2 className="text-base font-semibold">Export Workspace</h2>
            </div>
          </Card.Header>
          <Card.Content className="space-y-4 pt-3">
            <p className="text-sm text-default-500">
              Export includes workspace context, schema version, export timestamp, and system references.
            </p>

            <Button
              variant="outline"
              size="sm"
              isDisabled={exportLoading}
              onPress={generateExport}
              className="flex items-center gap-1.5"
            >
              {exportLoading ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
              Generate export manifest
            </Button>

            {exportManifest != null && (
              <div className="mt-3 space-y-2">
                <Separator />
                <p className="text-sm font-medium pt-2">Manifest ready</p>
                <a
                  href={`data:application/json;charset=utf-8,${encodeURIComponent(
                    JSON.stringify(exportManifest, null, 2)
                  )}`}
                  download="workspace-export.json"
                  className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-2"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download workspace-export.json
                </a>
              </div>
            )}
          </Card.Content>
        </Card>

        {/* ── 5. Workspace Lifecycle ── */}
        <Card className="border border-danger-100">
          <Card.Header className="pb-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-danger shrink-0" />
                <h2 className="text-base font-semibold">Workspace Lifecycle</h2>
              </div>
              <Chip
                color={isActive ? "success" : "danger"}
                variant="soft"
                size="sm"
              >
                {workspaceState}
              </Chip>
            </div>
          </Card.Header>
          <Card.Content className="space-y-4 pt-3">
            <p className="text-sm text-default-500">
              Workspace deactivation is supported for controlled shutdown. Hard delete is not supported;
              deactivated workspaces can be reactivated.
            </p>

            {isActive ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="deactivate-reason" className="text-sm font-medium text-default-700">
                    Deactivation reason
                  </label>
                  <input
                    id="deactivate-reason"
                    type="text"
                    placeholder="Security review pending"
                    value={deactivateReason}
                    onChange={(e) => setDeactivateReason(e.target.value)}
                    className="rounded-lg border border-default-200 bg-white px-3 py-2 text-sm text-default-800 shadow-sm outline-none placeholder:text-default-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <Button
                  variant="danger-soft"
                  size="sm"
                  onPress={() => setDeactivateOpen(true)}
                  className="flex items-center gap-1.5"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Deactivate workspace
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                isDisabled={lifecycleSaving}
                onPress={handleReactivate}
                className="flex items-center gap-1.5"
              >
                {lifecycleSaving && <Spinner size="sm" />}
                Reactivate workspace
              </Button>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* ── Deactivation confirmation modal ── */}
      <Modal isOpen={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <ModalBackdrop isDismissable />
        <ModalContainer placement="center">
          <ModalDialog>
            <ModalHeader className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-danger" />
              Confirm workspace deactivation
            </ModalHeader>
            <ModalBody>
              <p className="text-sm text-default-600">
                This will deactivate the workspace. All active sessions and agent runs will be
                suspended. You can reactivate at any time.
              </p>
              {deactivateReason && (
                <p className="text-sm text-default-500">
                  Reason: <span className="font-medium">{deactivateReason}</span>
                </p>
              )}
              <div className="flex flex-col gap-1">
                <label htmlFor="confirm-phrase" className="text-sm font-medium text-default-700">
                  Type &quot;DEACTIVATE&quot; to confirm
                </label>
                <input
                  id="confirm-phrase"
                  type="text"
                  placeholder="DEACTIVATE"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  className={[
                    "rounded-lg border bg-white px-3 py-2 text-sm shadow-sm outline-none placeholder:text-default-400 focus:ring-2",
                    confirmPhrase.length > 0 && confirmPhrase !== "DEACTIVATE"
                      ? "border-danger-400 focus:border-danger-400 focus:ring-danger-100"
                      : "border-default-200 focus:border-primary-400 focus:ring-primary-100",
                  ].join(" ")}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setDeactivateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isDisabled={confirmPhrase !== "DEACTIVATE" || lifecycleSaving}
                onPress={() => void handleDeactivateConfirm()}
                className="flex items-center gap-1.5"
              >
                {lifecycleSaving && <Spinner size="sm" />}
                Deactivate workspace
              </Button>
            </ModalFooter>
          </ModalDialog>
        </ModalContainer>
      </Modal>
    </SettingsShell>
  );
}
