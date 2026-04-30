"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Download,
  Globe,
  Key,
  Lock,
  Network,
  Shield,
  Timer,
} from "lucide-react";
import {
  Button,
  CardShell,
  CardHeader,
  CardBody,
  CardFooter,
  Dialog,
  HelpText,
  InlineCode,
  PageHeader,
  Spinner,
  StatusBadge,
} from "@/components/ui";

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
  ipAllowlist?: string[];
  sessionPolicy?: { maxIdleMinutes?: number; maxLifetimeHours?: number };
  mfaEnforced?: boolean;
}

interface AgentPolicy {
  scope?: string;
  risk?: {
    posture?: string;
    safeAutoApplyEnabled?: boolean;
    maxProposalBatchSize?: number;
  };
  approval?: { strictness?: string };
  tool?: { allowedTools?: string[] };
  cost?: { maxRunCostUsd?: number };
  runtime?: { maxRunDurationMs?: number; maxProviderCallsPerRun?: number };
}

// ── page ──────────────────────────────────────────────────────────────────

export default function TrustSettingsPage() {
  const [data, setData] = useState<TrustData | null>(null);

  // SSO / auth
  const [mode, setMode]                       = useState("shared");
  const [allowedDomains, setAllowedDomains]   = useState("");
  const [auth0Connection, setAuth0Connection] = useState("");
  const [authSaving, setAuthSaving]           = useState(false);
  const [authDirty, setAuthDirty]             = useState(false);

  // Domain allowlist (alias for SSO domains UI)
  const [domainListDirty, setDomainListDirty] = useState(false);

  // IP allowlist
  const [ipAllowlist, setIpAllowlist]   = useState("");
  const [ipSaving, setIpSaving]         = useState(false);
  const [ipDirty, setIpDirty]           = useState(false);

  // Session policy
  const [maxIdleMinutes, setMaxIdleMinutes]     = useState("60");
  const [maxLifetimeHours, setMaxLifetimeHours] = useState("12");
  const [sessionSaving, setSessionSaving]       = useState(false);
  const [sessionDirty, setSessionDirty]         = useState(false);

  // MFA
  const [mfaEnforced, setMfaEnforced] = useState(false);
  const [mfaSaving, setMfaSaving]     = useState(false);
  const [mfaDirty, setMfaDirty]       = useState(false);

  // Agent policy
  const [policy, setPolicy] = useState<AgentPolicy | null>(null);

  // Workspace lifecycle
  const [exportManifest, setExportManifest]     = useState<unknown>(null);
  const [exportLoading, setExportLoading]       = useState(false);
  const [deactivateOpen, setDeactivateOpen]     = useState(false);
  const [deactivateReason, setDeactivateReason] = useState("Security review pending");
  const [confirmPhrase, setConfirmPhrase]       = useState("");
  const [lifecycleSaving, setLifecycleSaving]   = useState(false);

  // ── load ──────────────────────────────────────────────────────────────────
  const loadTrust = useCallback(async () => {
    const res = await fetch("/api/settings/trust");
    const body = await res.json();
    if (!body.ok) return;
    const d: TrustData = body.data;
    setData(d);
    setAllowedDomains((d.auth.allowedDomains ?? []).join(", "));
    setAuth0Connection(d.auth.auth0Connection ?? "");
    setMode(d.auth.mode ?? "shared");
    setIpAllowlist((d.ipAllowlist ?? []).join(", "));
    setMaxIdleMinutes(String(d.sessionPolicy?.maxIdleMinutes ?? 60));
    setMaxLifetimeHours(String(d.sessionPolicy?.maxLifetimeHours ?? 12));
    setMfaEnforced(Boolean(d.mfaEnforced));
    setAuthDirty(false);
    setDomainListDirty(false);
    setIpDirty(false);
    setSessionDirty(false);
    setMfaDirty(false);
  }, []);

  const loadPolicy = useCallback(async () => {
    const res = await fetch("/api/agent/policy");
    const body = await res.json();
    if (!body.ok) return;
    setPolicy(body.data as AgentPolicy);
  }, []);

  useEffect(() => {
    void loadTrust();
    void loadPolicy();
  }, [loadTrust, loadPolicy]);

  // ── save handlers ─────────────────────────────────────────────────────────
  async function saveAuth() {
    setAuthSaving(true);
    try {
      const res = await fetch("/api/settings/trust", {
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
      const body = await res.json();
      if (body.ok) {
        toast.success("Authentication saved");
      } else {
        toast.error(body.error ?? "Failed to save authentication");
      }
      await loadTrust();
    } catch {
      toast.error("Failed to save authentication");
    } finally {
      setAuthSaving(false);
    }
  }

  async function saveDomains() {
    // Save same payload as auth (domain list is part of the auth payload)
    setAuthSaving(true);
    try {
      const res = await fetch("/api/settings/trust", {
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
      const body = await res.json();
      if (body.ok) {
        toast.success("Domain allowlist saved");
      } else {
        toast.error(body.error ?? "Failed to save domain allowlist");
      }
      await loadTrust();
    } catch {
      toast.error("Failed to save domain allowlist");
    } finally {
      setAuthSaving(false);
    }
  }

  async function saveIp() {
    setIpSaving(true);
    try {
      const res = await fetch("/api/settings/trust", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          section: "ipAllowlist",
          payload: ipAllowlist
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const body = await res.json();
      if (body.ok) {
        toast.success("IP allowlist saved");
      } else {
        toast.error(body.error ?? "Failed to save IP allowlist");
      }
      await loadTrust();
    } catch {
      toast.error("Failed to save IP allowlist");
    } finally {
      setIpSaving(false);
    }
  }

  async function saveSession() {
    setSessionSaving(true);
    try {
      const res = await fetch("/api/settings/trust", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          section: "sessionPolicy",
          payload: {
            maxIdleMinutes: Number(maxIdleMinutes) || 60,
            maxLifetimeHours: Number(maxLifetimeHours) || 12,
          },
        }),
      });
      const body = await res.json();
      if (body.ok) {
        toast.success("Session policy saved");
      } else {
        toast.error(body.error ?? "Failed to save session policy");
      }
      await loadTrust();
    } catch {
      toast.error("Failed to save session policy");
    } finally {
      setSessionSaving(false);
    }
  }

  async function saveMfa() {
    setMfaSaving(true);
    try {
      const res = await fetch("/api/settings/trust", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          section: "mfa",
          payload: { enforced: mfaEnforced },
        }),
      });
      const body = await res.json();
      if (body.ok) {
        toast.success("MFA policy saved");
      } else {
        toast.error(body.error ?? "Failed to save MFA policy");
      }
      await loadTrust();
    } catch {
      toast.error("Failed to save MFA policy");
    } finally {
      setMfaSaving(false);
    }
  }

  async function generateExport() {
    setExportLoading(true);
    try {
      const res = await fetch("/api/settings/export/workspace", { method: "POST" });
      const body = await res.json();
      if (body.ok) {
        setExportManifest(body.data);
        toast.success("Export manifest generated");
      } else {
        toast.error(body.error ?? "Failed to generate export");
      }
    } catch {
      toast.error("Failed to generate export");
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDeactivateConfirm() {
    if (confirmPhrase !== "DEACTIVATE") return;
    setLifecycleSaving(true);
    try {
      const res = await fetch("/api/settings/trust", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "deactivate",
          reason: deactivateReason,
          confirmation: confirmPhrase,
        }),
      });
      const body = await res.json();
      if (body.ok) {
        toast.success("Workspace deactivated");
      } else {
        toast.error(body.error ?? "Failed to deactivate workspace");
      }
      await loadTrust();
    } catch {
      toast.error("Failed to deactivate workspace");
    } finally {
      setLifecycleSaving(false);
      setDeactivateOpen(false);
      setConfirmPhrase("");
    }
  }

  async function handleReactivate() {
    setLifecycleSaving(true);
    try {
      const res = await fetch("/api/settings/trust", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reactivate" }),
      });
      const body = await res.json();
      if (body.ok) {
        toast.success("Workspace reactivated");
      } else {
        toast.error(body.error ?? "Failed to reactivate workspace");
      }
      await loadTrust();
    } catch {
      toast.error("Failed to reactivate workspace");
    } finally {
      setLifecycleSaving(false);
    }
  }

  // suppress lint by referencing imported type
  void policy;

  // ── derived values ────────────────────────────────────────────────────────
  const workspaceState = data?.workspaceState?.state ?? "active";
  const isActive = workspaceState === "active";

  const ssoEnabled         = mode === "sso_ready";
  const domainCount        = allowedDomains.split(",").map((s) => s.trim()).filter(Boolean).length;
  const ipCount            = ipAllowlist.split(",").map((s) => s.trim()).filter(Boolean).length;

  const inputBase =
    "h-10 rounded-lg border border-black/[0.08] bg-white px-3 t-label text-[#111] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Trust & security"
        subtitle="Authentication, access policies, and workspace lifecycle controls."
      />

      {/* ── SSO config ─────────────────────────────────────────────────────── */}
      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-[#8E8E93]" />
                <h2 className="t-title text-[#111]">Single sign-on</h2>
              </div>
              <p className="mt-1 t-caption text-[#8E8E93]">
                <InlineCode>sso_ready</InlineCode> mode prepares domain and connection metadata for your Auth0 tenant.
              </p>
            </div>
            <StatusBadge tone={ssoEnabled ? "success" : "neutral"} pulse={ssoEnabled}>
              {ssoEnabled ? "Enabled" : "Disabled"}
            </StatusBadge>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-1.5 max-w-sm">
            <label htmlFor="auth-mode" className="t-label font-medium text-[#111]">
              Authentication mode
            </label>
            <select
              id="auth-mode"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setAuthDirty(true);
              }}
              className={inputBase}
            >
              <option value="shared">Shared Auth0 tenant</option>
              <option value="sso_ready">Customer SSO (sso_ready)</option>
            </select>
          </div>

          {ssoEnabled && (
            <div className="flex flex-col gap-1.5 max-w-sm">
              <label htmlFor="auth0-connection" className="t-label font-medium text-[#111]">
                Auth0 connection name
              </label>
              <input
                id="auth0-connection"
                type="text"
                placeholder="acme-saml"
                value={auth0Connection}
                onChange={(e) => {
                  setAuth0Connection(e.target.value);
                  setAuthDirty(true);
                }}
                className={inputBase}
              />
              <HelpText>Required for sso_ready mode.</HelpText>
            </div>
          )}
        </CardBody>
        <CardFooter>
          <HelpText>SSO provisioning is finalized in your Auth0 tenant.</HelpText>
          <Button
            variant="primary"
            isDisabled={authSaving || !authDirty}
            onPress={saveAuth}
            className="flex items-center gap-1.5"
          >
            {authSaving ? <Spinner size="sm" /> : null}
            Save changes
          </Button>
        </CardFooter>
      </CardShell>

      {/* ── Domain allowlist ──────────────────────────────────────────────── */}
      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-[#8E8E93]" />
                <h2 className="t-title text-[#111]">Domain allowlist</h2>
              </div>
              <p className="mt-1 t-caption text-[#8E8E93]">
                Only users with these email domains can be invited.
              </p>
            </div>
            <StatusBadge tone={domainCount > 0 ? "info" : "neutral"}>
              {domainCount} domain{domainCount === 1 ? "" : "s"}
            </StatusBadge>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="allowed-domains" className="t-label font-medium text-[#111]">
              Allowed domains
            </label>
            <input
              id="allowed-domains"
              type="text"
              placeholder="acme.com, corp.example.com"
              value={allowedDomains}
              onChange={(e) => {
                setAllowedDomains(e.target.value);
                setDomainListDirty(true);
              }}
              className={inputBase}
            />
            <HelpText>Comma-separated list. Leave empty to allow any domain.</HelpText>
          </div>
        </CardBody>
        <CardFooter>
          <HelpText>Existing members are not affected by changes here.</HelpText>
          <Button
            variant="primary"
            isDisabled={authSaving || !domainListDirty}
            onPress={saveDomains}
            className="flex items-center gap-1.5"
          >
            {authSaving ? <Spinner size="sm" /> : null}
            Save changes
          </Button>
        </CardFooter>
      </CardShell>

      {/* ── IP restrictions ───────────────────────────────────────────────── */}
      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Network size={14} className="text-[#8E8E93]" />
                <h2 className="t-title text-[#111]">IP restrictions</h2>
              </div>
              <p className="mt-1 t-caption text-[#8E8E93]">
                Restrict workspace access to specific networks.
              </p>
            </div>
            <StatusBadge tone={ipCount > 0 ? "info" : "neutral"}>
              {ipCount > 0 ? `${ipCount} rule${ipCount === 1 ? "" : "s"}` : "Open"}
            </StatusBadge>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ip-allowlist" className="t-label font-medium text-[#111]">
              Allowed CIDR ranges
            </label>
            <input
              id="ip-allowlist"
              type="text"
              placeholder="10.0.0.0/8, 192.168.1.0/24"
              value={ipAllowlist}
              onChange={(e) => {
                setIpAllowlist(e.target.value);
                setIpDirty(true);
              }}
              className={inputBase}
            />
            <HelpText>Comma-separated list of IPv4 CIDR blocks. Empty means no restriction.</HelpText>
          </div>
        </CardBody>
        <CardFooter>
          <HelpText>Applies to web and API traffic.</HelpText>
          <Button
            variant="primary"
            isDisabled={ipSaving || !ipDirty}
            onPress={saveIp}
            className="flex items-center gap-1.5"
          >
            {ipSaving ? <Spinner size="sm" /> : null}
            Save changes
          </Button>
        </CardFooter>
      </CardShell>

      {/* ── Session policy ────────────────────────────────────────────────── */}
      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Timer size={14} className="text-[#8E8E93]" />
                <h2 className="t-title text-[#111]">Session policy</h2>
              </div>
              <p className="mt-1 t-caption text-[#8E8E93]">
                When users get signed out automatically.
              </p>
            </div>
            <StatusBadge tone="info">
              {maxIdleMinutes}m idle / {maxLifetimeHours}h max
            </StatusBadge>
          </div>
        </CardHeader>
        <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="max-idle" className="t-label font-medium text-[#111]">
              Max idle (minutes)
            </label>
            <input
              id="max-idle"
              type="number"
              min={0}
              value={maxIdleMinutes}
              onChange={(e) => {
                setMaxIdleMinutes(e.target.value);
                setSessionDirty(true);
              }}
              className={inputBase}
            />
            <HelpText>Sign out after this much inactivity.</HelpText>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="max-lifetime" className="t-label font-medium text-[#111]">
              Max session lifetime (hours)
            </label>
            <input
              id="max-lifetime"
              type="number"
              min={0}
              value={maxLifetimeHours}
              onChange={(e) => {
                setMaxLifetimeHours(e.target.value);
                setSessionDirty(true);
              }}
              className={inputBase}
            />
            <HelpText>Hard cap regardless of activity.</HelpText>
          </div>
        </CardBody>
        <CardFooter>
          <HelpText>Active sessions are unaffected until refresh.</HelpText>
          <Button
            variant="primary"
            isDisabled={sessionSaving || !sessionDirty}
            onPress={saveSession}
            className="flex items-center gap-1.5"
          >
            {sessionSaving ? <Spinner size="sm" /> : null}
            Save changes
          </Button>
        </CardFooter>
      </CardShell>

      {/* ── MFA enforcement ───────────────────────────────────────────────── */}
      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-[#8E8E93]" />
                <h2 className="t-title text-[#111]">Multi-factor authentication</h2>
              </div>
              <p className="mt-1 t-caption text-[#8E8E93]">
                Require all members to enroll in MFA via Auth0.
              </p>
            </div>
            <StatusBadge tone={mfaEnforced ? "success" : "warning"} pulse={mfaEnforced}>
              {mfaEnforced ? "Enforced" : "Optional"}
            </StatusBadge>
          </div>
        </CardHeader>
        <CardBody>
          <label className="flex items-start justify-between gap-4 cursor-pointer">
            <div>
              <div className="t-label font-medium text-[#111]">Require MFA for all members</div>
              <HelpText>Members without MFA enrolled will be prompted at next sign-in.</HelpText>
            </div>
            <input
              type="checkbox"
              checked={mfaEnforced}
              onChange={(e) => {
                setMfaEnforced(e.target.checked);
                setMfaDirty(true);
              }}
              className="mt-1 accent-indigo-600 w-4 h-4"
            />
          </label>
        </CardBody>
        <CardFooter>
          <HelpText>Owners are exempt from lockout.</HelpText>
          <Button
            variant="primary"
            isDisabled={mfaSaving || !mfaDirty}
            onPress={saveMfa}
            className="flex items-center gap-1.5"
          >
            {mfaSaving ? <Spinner size="sm" /> : null}
            Save changes
          </Button>
        </CardFooter>
      </CardShell>

      {/* ── Workspace export ──────────────────────────────────────────────── */}
      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center gap-2">
            <Download size={14} className="text-[#8E8E93]" />
            <h2 className="t-title text-[#111]">Export workspace</h2>
          </div>
          <p className="mt-1 t-caption text-[#8E8E93]">
            Snapshot includes workspace context, schema version, and system references.
          </p>
        </CardHeader>
        <CardBody className="space-y-3">
          <Button
            variant="outline"
            isDisabled={exportLoading}
            onPress={generateExport}
            className="flex items-center gap-1.5"
          >
            {exportLoading ? <Spinner size="sm" /> : <Download size={14} />}
            Generate manifest
          </Button>
          {exportManifest != null && (
            <div className="border border-[var(--color-line)] rounded-md bg-[#FAFAFA] p-3 space-y-2">
              <div className="t-label font-semibold text-[#111]">Manifest ready</div>
              <a
                href={`data:application/json;charset=utf-8,${encodeURIComponent(
                  JSON.stringify(exportManifest, null, 2),
                )}`}
                download="workspace-export.json"
                className="inline-flex items-center gap-1.5 t-label text-indigo-600 hover:text-indigo-700"
              >
                <Download size={13} />
                Download workspace-export.json
              </a>
            </div>
          )}
        </CardBody>
      </CardShell>

      {/* ── Danger zone ───────────────────────────────────────────────────── */}
      <CardShell className="border-[#FCA5A5]">
        <CardHeader bordered className="border-b-[#FCA5A5]/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-[#DC2626]" />
              <h2 className="t-title text-[#991B1B]">Workspace lifecycle</h2>
            </div>
            <StatusBadge tone={isActive ? "success" : "danger"} pulse={isActive}>
              {workspaceState}
            </StatusBadge>
          </div>
          <p className="mt-1 t-caption text-[#8E8E93]">
            Deactivation suspends sessions and agent runs. Reactivation restores access.
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          {isActive ? (
            <>
              <div className="flex flex-col gap-1.5 max-w-md">
                <label htmlFor="deactivate-reason" className="t-label font-medium text-[#111]">
                  Reason
                </label>
                <input
                  id="deactivate-reason"
                  type="text"
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  className={inputBase}
                />
                <HelpText>Recorded in the audit log.</HelpText>
              </div>
              <Button
                variant="danger-soft"
                onPress={() => setDeactivateOpen(true)}
                className="flex items-center gap-1.5"
              >
                <AlertTriangle size={14} />
                Deactivate workspace
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              isDisabled={lifecycleSaving}
              onPress={handleReactivate}
              className="flex items-center gap-1.5"
            >
              {lifecycleSaving ? <Spinner size="sm" /> : <Key size={14} />}
              Reactivate workspace
            </Button>
          )}
        </CardBody>
      </CardShell>

      {/* ── Deactivation dialog ───────────────────────────────────────────── */}
      <Dialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        title="Confirm workspace deactivation"
        description="Active sessions and agent runs will be suspended. You can reactivate at any time."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onPress={() => setDeactivateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              isDisabled={confirmPhrase !== "DEACTIVATE" || lifecycleSaving}
              onPress={() => void handleDeactivateConfirm()}
              className="flex items-center gap-1.5"
            >
              {lifecycleSaving ? <Spinner size="sm" /> : <AlertTriangle size={14} />}
              Deactivate
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {deactivateReason && (
            <p className="t-label text-[#3C3C43]">
              Reason: <span className="font-medium text-[#111]">{deactivateReason}</span>
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm-phrase" className="t-label font-medium text-[#111]">
              Type <InlineCode>DEACTIVATE</InlineCode> to confirm
            </label>
            <input
              id="confirm-phrase"
              type="text"
              placeholder="DEACTIVATE"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              className={
                confirmPhrase.length > 0 && confirmPhrase !== "DEACTIVATE"
                  ? "h-10 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 t-label text-[#991B1B] outline-none focus:ring-2 focus:ring-red-100"
                  : inputBase
              }
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
