"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Spinner } from "@heroui/react";
import { Zap, Key, CheckCircle2, Copy, ExternalLink, ChevronRight, ArrowRight } from "lucide-react";

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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-600 hover:text-slate-900 transition-all shadow-sm shrink-0"
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : (label ?? "Copy")}
    </button>
  );
}

function CodePanel({ children, label, copyText }: { children: React.ReactNode; label?: string; copyText?: string }) {
  return (
    <div className="rounded-2xl bg-slate-900 overflow-hidden shadow-lg">
      {label && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
          {copyText && <CopyButton text={copyText} />}
        </div>
      )}
      <div className="px-5 py-4 text-sm font-mono text-green-400 leading-relaxed overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step components
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
        <h2 className="text-xl font-bold text-slate-900">Your MCP endpoint</h2>
        <p className="mt-1 text-sm text-slate-500">
          This is where every agent connects. One URL. Paste it anywhere that speaks MCP.
        </p>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5 space-y-2">
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Endpoint</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 text-sm font-mono text-indigo-900 font-semibold break-all">
            {endpoint}
          </code>
          <CopyButton text={endpoint} />
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">Claude Desktop config</p>
        <CodePanel label="~/.claude/config.json" copyText={claudeConfig}>
          <pre className="whitespace-pre-wrap text-xs">{claudeConfig}</pre>
        </CodePanel>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">Any HTTP client</p>
        <CodePanel label="curl" copyText={`curl -X POST ${endpoint} \\\n  -H "Authorization: Bearer YOUR_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"tool":"list_systems"}'`}>
          <pre className="whitespace-pre-wrap text-xs">{`curl -X POST ${endpoint} \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"tool":"list_systems"}'`}</pre>
        </CodePanel>
      </div>
    </div>
  );
}

function StepToken() {
  const capabilities = [
    { name: "systems:read", description: "List and view systems", required: true },
    { name: "schema:read", description: "Export system schema", required: true },
    { name: "validation:read", description: "Run validation reports", required: false },
    { name: "graph:write", description: "Add/edit nodes and pipes", required: false },
    { name: "versions:write", description: "Create version snapshots", required: false },
    { name: "comments:write", description: "Post comments on systems", required: false },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Create a token</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tokens are how agents authenticate. Each token gets exactly the capabilities you grant — nothing more.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available capabilities</p>
        </div>
        {capabilities.map((cap) => (
          <div key={cap.name} className="flex items-center gap-4 px-5 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono font-semibold text-slate-800">{cap.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{cap.description}</p>
            </div>
            {cap.required && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full shrink-0">
                Recommended
              </span>
            )}
          </div>
        ))}
      </div>

      <a
        href="/settings/tokens"
        className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors shadow-sm"
      >
        <Key className="w-4 h-4" />
        Create token in Settings
        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
      </a>

      <p className="text-xs text-slate-400 text-center">
        Tokens are shown once at creation. Store them somewhere safe.
      </p>
    </div>
  );
}

type TestResult = { ok: boolean; systemCount: number; error?: string };

function StepTest({ origin }: { origin: string }) {
  const [token, setToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = async () => {
    if (!token.trim()) { toast.error("Enter your token first"); return; }
    setTesting(true);
    setResult(null);
    try {
      const res = await fetch(`${origin}/api/protocol/mcp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token.trim()}`,
        },
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
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Test your connection</h2>
        <p className="mt-1 text-sm text-slate-500">
          Paste your token here to verify everything works. We{"'"}ll call <code className="font-mono text-xs bg-slate-100 px-1 rounded">list_systems</code> on your behalf.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Your token</label>
        <div className="flex gap-2">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ptk_…"
            className="flex-1 h-11 rounded-xl border border-slate-200 px-4 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
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
        <div className={`rounded-2xl p-5 border ${result.ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          {result.ok ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-green-900">Connected!</p>
                <p className="text-sm text-green-700 mt-0.5">
                  Your agent can see <strong>{result.systemCount}</strong> system{result.systemCount !== 1 ? "s" : ""} in this workspace.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div>
                <p className="text-sm font-bold text-red-900">Connection failed</p>
                <p className="text-sm text-red-700 mt-0.5 font-mono text-xs">{result.error}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {result?.ok && (
        <div className="rounded-2xl bg-slate-900 p-5 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">What your agent can do next</p>
          <div className="space-y-1.5 mt-2">
            {[
              { tool: "export_system_schema", desc: "Read the full schema of a system" },
              { tool: "apply_graph_actions", desc: "Add nodes, draw connections" },
              { tool: "create_version", desc: "Snapshot the current state" },
              { tool: "get_validation_report", desc: "Check for errors and warnings" },
            ].map((t) => (
              <div key={t.tool} className="flex items-baseline gap-2">
                <code className="text-xs font-mono text-indigo-400 shrink-0">{t.tool}</code>
                <span className="text-xs text-slate-500">— {t.desc}</span>
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
  { id: "token", label: "Token", icon: <Key className="w-4 h-4" /> },
  { id: "test", label: "Test", icon: <CheckCircle2 className="w-4 h-4" /> },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export default function ConnectPage() {
  const [step, setStep] = useState<StepId>("endpoint");
  const [origin, setOrigin] = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const currentIndex = STEPS.findIndex((s) => s.id === step);
  const isLast = currentIndex === STEPS.length - 1;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-indigo-500" />
          <h1 className="text-2xl font-bold text-slate-900">Connect to an Agent</h1>
        </div>
        <p className="text-sm text-slate-500">
          Three steps. Your system will be live in any AI agent in under two minutes.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-10">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                step === s.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : i < currentIndex
                  ? "text-green-600 bg-green-50"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {i < currentIndex ? <CheckCircle2 className="w-4 h-4" /> : s.icon}
              {s.label}
            </button>
            {i < STEPS.length - 1 && (
              <ArrowRight className="w-4 h-4 text-slate-300 mx-1 shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="min-h-[400px]">
        {step === "endpoint" && <StepEndpoint origin={origin} />}
        {step === "token" && <StepToken />}
        {step === "test" && <StepTest origin={origin} />}
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
