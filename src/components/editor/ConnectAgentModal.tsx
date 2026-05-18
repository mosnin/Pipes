"use client";

import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { X, Copy, CheckCircle2, Zap, Key, ChevronRight, ExternalLink } from "lucide-react";

type Props = {
  systemId: string;
  systemName: string;
  onClose: () => void;
};

type Step = "endpoint" | "token" | "schema";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
      aria-label="Copy"
    >
      {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

function CodeBlock({ value, label }: { value: string; label?: string }) {
  return (
    <div className="mt-2 rounded-xl bg-slate-900 overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
          <CopyButton text={value} />
        </div>
      )}
      <div className="flex items-start gap-2 px-4 py-3">
        <code className="flex-1 text-xs font-mono text-green-400 break-all whitespace-pre-wrap leading-relaxed">
          {value}
        </code>
        {!label && <CopyButton text={value} />}
      </div>
    </div>
  );
}

export function ConnectAgentModal({ systemId, systemName, onClose }: Props) {
  const [step, setStep] = useState<Step>("endpoint");
  const [schema, setSchema] = useState<string | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const endpoint = `${origin}/api/protocol/mcp`;

  const loadSchema = async () => {
    if (schema) return;
    setSchemaLoading(true);
    try {
      const res = await fetch(`/api/schema-export?systemId=${encodeURIComponent(systemId)}`);
      const data = await res.json();
      setSchema(JSON.stringify(data.data ?? data, null, 2));
    } catch {
      setSchema("// Could not load schema");
    } finally {
      setSchemaLoading(false);
    }
  };

  const handleStepChange = (s: Step) => {
    setStep(s);
    if (s === "schema") void loadSchema();
  };

  const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
    { id: "endpoint", label: "Endpoint", icon: <Zap className="w-3.5 h-3.5" /> },
    { id: "token", label: "Token", icon: <Key className="w-3.5 h-3.5" /> },
    { id: "schema", label: "Preview", icon: <ExternalLink className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-xl sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-500" />
              Connect to Agent
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{systemName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps */}
        <div className="flex border-b border-slate-100">
          {steps.map((s, i) => (
            <button
              key={s.id}
              onClick={() => handleStepChange(s.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2 ${
                step === s.id
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {s.icon}
              {s.label}
              {i < steps.length - 1 && (
                <ChevronRight className="w-3 h-3 text-slate-200 absolute" style={{ display: "none" }} />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {step === "endpoint" && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Your MCP endpoint</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Use this URL in your agent or Claude desktop config.
                </p>
                <CodeBlock value={endpoint} />
              </div>

              <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-4 space-y-2">
                <p className="text-xs font-semibold text-indigo-800">Claude Desktop config</p>
                <CodeBlock
                  value={`{
  "mcpServers": {
    "pipes": {
      "url": "${endpoint}",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  }
}`}
                />
              </div>

              <Button
                variant="primary"
                className="w-full"
                onPress={() => handleStepChange("token")}
              >
                Next: Get a token
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === "token" && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Create an API token</p>
                <p className="text-xs text-slate-500 mt-1">
                  Tokens authenticate your agent to the Pipes MCP endpoint. Grant only the capabilities it needs.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-700">Recommended capabilities for a read-only agent:</p>
                <div className="flex flex-wrap gap-1.5">
                  {["systems:read", "schema:read", "validation:read"].map((cap) => (
                    <span key={cap} className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {cap}
                    </span>
                  ))}
                </div>
                <p className="text-xs font-semibold text-slate-700">For a builder agent, also add:</p>
                <div className="flex flex-wrap gap-1.5">
                  {["graph:write", "versions:write", "comments:write"].map((cap) => (
                    <span key={cap} className="text-[11px] font-mono bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              <a
                href="/settings/tokens"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors"
              >
                <Key className="w-4 h-4" />
                Create token in Settings
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              <Button variant="outline" className="w-full" onPress={() => handleStepChange("schema")}>
                Next: Preview what the agent sees
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === "schema" && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">What your agent sees</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  This is the <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">pipes_schema_v1</code> export — the exact structure an agent receives when it calls <code className="font-mono text-[11px] bg-slate-100 px-1 rounded">export_system_schema</code>.
                </p>
              </div>

              {schemaLoading ? (
                <div className="h-48 rounded-xl bg-slate-900 flex items-center justify-center">
                  <p className="text-xs text-slate-400 animate-pulse">Loading schema…</p>
                </div>
              ) : schema ? (
                <div className="rounded-xl bg-slate-900 overflow-hidden max-h-64">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      pipes_schema_v1
                    </span>
                    <CopyButton text={schema} />
                  </div>
                  <pre className="overflow-auto max-h-48 px-4 py-3 text-[11px] font-mono text-green-400 leading-relaxed">
                    {schema.slice(0, 2000)}{schema.length > 2000 ? "\n\n… (truncated)" : ""}
                  </pre>
                </div>
              ) : null}

              <div className="pt-1">
                <p className="text-xs text-slate-400 text-center">
                  That{"'"}s it. Your agent is ready.{" "}
                  <a href="/connect" className="text-indigo-500 hover:underline">Full setup guide →</a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
