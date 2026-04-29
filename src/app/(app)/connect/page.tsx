"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Spinner } from "@heroui/react";
import {
  Zap, Key, CheckCircle2, Copy, ExternalLink,
  ChevronRight, ArrowRight,
} from "lucide-react";
import { AGENT_CAPABILITIES } from "@/lib/protocol/tokens";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied");
    });
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-black/[0.08] hover:border-black/[0.14] t-caption font-medium text-[#3C3C43] hover:text-[#111] transition-all shrink-0"
      style={{ borderRadius: "8px" }}
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : (label ?? "Copy")}
    </button>
  );
}

function CodePanel({ children, label, copyText }: { children: React.ReactNode; label?: string; copyText?: string }) {
  return (
    <div className="bg-[#111] overflow-hidden" style={{ borderRadius: "12px" }}>
      {label && (
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <span className="t-caption font-bold uppercase tracking-widest text-[#8E8E93]">{label}</span>
          {copyText && <CopyButton text={copyText} />}
        </div>
      )}
      <div className="px-5 py-4 t-label font-mono text-green-400 leading-relaxed overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Endpoint
// ---------------------------------------------------------------------------

function StepEndpoint({ origin }: { origin: string }) {
  const endpoint = `${origin}/api/protocol/mcp`;
  const claudeConfig = `{
  "mcpServers": {
    "pipes": {
      "url": "${endpoint}",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      }
    }
  }
}`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#111]" style={{ letterSpacing: "-0.02em" }}>Your MCP endpoint</h2>
        <p className="mt-1 t-label text-[#8E8E93]">
          One URL. Paste it anywhere that speaks MCP.
        </p>
      </div>

      <div className="border border-indigo-200 bg-indigo-50 p-5 space-y-2" style={{ borderRadius: "12px" }}>
        <p className="t-caption font-semibold text-indigo-600 uppercase tracking-wider">Endpoint</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 t-label font-mono text-indigo-900 font-semibold break-all">{endpoint}</code>
          <CopyButton text={endpoint} />
        </div>
      </div>

      <div>
        <p className="t-label font-semibold text-[#111] mb-3">Claude Desktop config</p>
        <CodePanel label="~/.claude/config.json" copyText={claudeConfig}>
          <pre className="whitespace-pre-wrap t-caption">{claudeConfig}</pre>
        </CodePanel>
      </div>

      <div>
        <p className="t-label font-semibold text-[#111] mb-3">Any HTTP client</p>
        <CodePanel
          label="curl"
          copyText={`curl -X POST ${endpoint} \\\n  -H "Authorization: Bearer YOUR_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"tool":"list_systems"}'`}
        >
          <pre className="whitespace-pre-wrap t-caption">{`curl -X POST ${endpoint} \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"tool":"list_systems"}'`}</pre>
        </CodePanel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Token (inline creation)
// ---------------------------------------------------------------------------

const CAPABILITY_LABELS: Record<string, string> = {
  "systems:read":       "View your systems",
  "schema:read":        "Export system schemas",
  "validation:read":    "Run validation reports",
  "graph:write":        "Add/edit nodes and pipes",
  "versions:write":     "Create version snapshots",
  "comments:write":     "Post comments on systems",
  "systems:write":      "Create/delete systems",
  "templates:read":     "Browse templates",
  "templates:instantiate": "Instantiate templates",
  "versions:read":      "Read version history",
  "import:write":       "Import schemas",
};

const RECOMMENDED = ["systems:read", "schema:read"];

function StepToken({ onTokenCreated }: { onTokenCreated: (secret: string) => void }) {
  const [name, setName] = useState("My Agent");
  const [capabilities, setCapabilities] = useState<string[]>(RECOMMENDED);
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggle = (cap: string) =>
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Token name is required"); return; }
    if (capabilities.length === 0) { toast.error("Select at least one capability"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/settings/tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, capabilities }),
      });
      const data = await res.json();
      if (data.ok) {
        setSecret(data.data.secret);
        onTokenCreated(data.data.secret);
        toast.success("Token created — copy it now, it won't be shown again");
      } else {
        toast.error(data.error ?? "Failed to create token");
      }
    } finally { setCreating(false); }
  };

  const copySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied");
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#111]" style={{ letterSpacing: "-0.02em" }}>Create an agent token</h2>
        <p className="mt-1 t-label text-[#8E8E93]">
          Grant only what the agent needs — nothing more.
        </p>
      </div>

      {!secret ? (
        <>
          {/* Token name */}
          <div className="space-y-1.5">
            <label className="t-caption font-semibold text-[#3C3C43] uppercase tracking-wider">Token name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Claude agent, CI pipeline"
              className="w-full h-10 border border-black/[0.08] px-3 t-label text-[#111] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              style={{ borderRadius: "8px" }}
            />
          </div>

          {/* Capabilities */}
          <div className="space-y-2">
            <label className="t-caption font-semibold text-[#3C3C43] uppercase tracking-wider">Capabilities</label>
            <div className="border border-black/[0.08] overflow-hidden" style={{ borderRadius: "12px" }}>
              {AGENT_CAPABILITIES.map((cap, i) => (
                <label
                  key={cap}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-black/[0.02] transition-colors ${i > 0 ? "border-t border-black/[0.06]" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={capabilities.includes(cap)}
                    onChange={() => toggle(cap)}
                    className="mt-0.5 rounded border-black/[0.2] text-indigo-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="t-label font-mono font-semibold text-[#111]">{cap}</p>
                    <p className="t-caption text-[#8E8E93] mt-0.5">{CAPABILITY_LABELS[cap] ?? cap}</p>
                  </div>
                  {RECOMMENDED.includes(cap) && (
                    <span className="t-caption font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                      Recommended
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            onPress={handleCreate}
            isDisabled={creating || capabilities.length === 0 || !name.trim()}
            className="w-full h-12 font-semibold t-body"
          >
            {creating ? <Spinner size="sm" /> : <><Key className="w-4 h-4" /> Create token</>}
          </Button>
        </>
      ) : (
        /* Token revealed */
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 p-5 space-y-3" style={{ borderRadius: "12px" }}>
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <p className="t-label font-bold">Token created — copy it now</p>
            </div>
            <p className="t-caption text-green-600">
              This secret will not be shown again. Store it somewhere safe.
            </p>
            <div className="flex items-center gap-2 bg-[#111] px-4 py-3" style={{ borderRadius: "8px" }}>
              <code className="flex-1 t-caption font-mono text-green-400 break-all">{secret}</code>
              <button
                onClick={copySecret}
                className="shrink-0 p-1.5 text-[#8E8E93] hover:text-white transition-colors"
                aria-label="Copy token"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="t-caption text-[#8E8E93] text-center">
            You can manage tokens any time in{" "}
            <a href="/settings/tokens" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5">
              Settings <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Test
// ---------------------------------------------------------------------------

type TestResult = { ok: boolean; systemCount: number; error?: string };

function StepTest({ origin, prefillToken }: { origin: string; prefillToken: string }) {
  const [token, setToken] = useState(prefillToken);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  useEffect(() => { if (prefillToken) setToken(prefillToken); }, [prefillToken]);

  const runTest = async () => {
    if (!token.trim()) { toast.error("Enter your token first"); return; }
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch(`${origin}/api/protocol/mcp`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token.trim()}` },
        body: JSON.stringify({ tool: "list_systems" }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult({ ok: true, systemCount: (data.data ?? []).length });
      } else {
        setResult({ ok: false, systemCount: 0, error: data.error ?? "Unknown error" });
      }
    } catch (e) {
      setResult({ ok: false, systemCount: 0, error: (e as Error).message });
    } finally { setTesting(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#111]" style={{ letterSpacing: "-0.02em" }}>Test your connection</h2>
        <p className="mt-1 t-label text-[#8E8E93]">
          {prefillToken
            ? "Your token is pre-filled — hit Test to verify."
            : "Paste your token to verify everything works."}
        </p>
      </div>

      <div className="space-y-2">
        <label className="t-caption font-semibold text-[#3C3C43] uppercase tracking-wider">Your token</label>
        <div className="flex gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ptk_…"
            className="flex-1 h-11 border border-black/[0.08] px-4 t-label font-mono text-[#111] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            style={{ borderRadius: "8px" }}
          />
          <Button
            variant="primary"
            onPress={runTest}
            isDisabled={testing || !token.trim()}
            className="h-11 px-5 font-semibold"
          >
            {testing ? <Spinner size="sm" /> : "Test"}
          </Button>
        </div>
      </div>

      {result && (
        <div className={`p-5 border ${result.ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
             style={{ borderRadius: "12px" }}>
          {result.ok ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="t-label font-bold text-green-900">Connected!</p>
                <p className="t-label text-green-700 mt-0.5">
                  Your agent can see <strong>{result.systemCount}</strong>{" "}
                  system{result.systemCount !== 1 ? "s" : ""} in this workspace.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white t-caption font-bold">!</span>
              </div>
              <div>
                <p className="t-label font-bold text-red-900">Connection failed</p>
                <p className="t-caption text-red-700 mt-0.5 font-mono">{result.error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {result?.ok && (
        <div className="bg-[#111] p-5 space-y-2" style={{ borderRadius: "12px" }}>
          <p className="t-caption font-semibold text-[#8E8E93] uppercase tracking-wider">What your agent can do next</p>
          <div className="space-y-1.5 mt-2">
            {[
              { tool: "export_system_schema",  desc: "Read the full schema of a system"   },
              { tool: "apply_graph_actions",   desc: "Add nodes, draw connections"         },
              { tool: "create_version",        desc: "Snapshot the current state"          },
              { tool: "get_validation_report", desc: "Check for errors and warnings"       },
            ].map((t) => (
              <div key={t.tool} className="flex items-baseline gap-2">
                <code className="t-caption font-mono text-indigo-400 shrink-0">{t.tool}</code>
                <span className="t-caption text-[#8E8E93]">— {t.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const STEPS = [
  { id: "endpoint", label: "Endpoint", icon: <Zap className="w-4 h-4" /> },
  { id: "token",    label: "Token",    icon: <Key className="w-4 h-4" /> },
  { id: "test",     label: "Test",     icon: <CheckCircle2 className="w-4 h-4" /> },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export default function ConnectPage() {
  const [step, setStep] = useState<StepId>("endpoint");
  const [origin, setOrigin] = useState("");
  const [createdToken, setCreatedToken] = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const currentIndex = STEPS.findIndex((s) => s.id === step);
  const isLast = currentIndex === STEPS.length - 1;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-indigo-600" />
          <h1 className="text-2xl font-bold text-[#111]" style={{ letterSpacing: "-0.03em" }}>
            Connect to an Agent
          </h1>
        </div>
        <p className="t-label text-[#8E8E93]">
          Three steps. Your system will be live in any AI agent in under two minutes.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-10">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-2 px-4 py-2.5 t-label font-semibold transition-all ${
                step === s.id
                  ? "bg-indigo-600 text-white"
                  : i < currentIndex
                  ? "text-green-600 bg-green-50"
                  : "text-[#8E8E93] hover:text-[#3C3C43]"
              }`}
              style={{ borderRadius: "10px" }}
            >
              {i < currentIndex ? <CheckCircle2 className="w-4 h-4" /> : s.icon}
              {s.label}
            </button>
            {i < STEPS.length - 1 && (
              <ArrowRight className="w-4 h-4 text-[#C7C7CC] mx-1 shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {step === "endpoint" && <StepEndpoint origin={origin} />}
        {step === "token" && (
          <StepToken onTokenCreated={(secret) => setCreatedToken(secret)} />
        )}
        {step === "test" && <StepTest origin={origin} prefillToken={createdToken} />}
      </div>

      {/* Navigation */}
      {!isLast && (
        <div className="mt-8 flex justify-end">
          <Button
            variant="primary"
            onPress={() => setStep(STEPS[currentIndex + 1].id)}
            className="h-11 px-8 font-semibold"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
