"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Spinner } from "@heroui/react";
import { CheckCircle2, Copy, Key, Zap } from "lucide-react";
import { AGENT_CAPABILITIES } from "@/lib/protocol/tokens";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success("Copied"); })}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-black/[0.08] hover:border-black/[0.14] t-caption font-medium text-[#3C3C43] hover:text-[#111] transition-all shrink-0"
      style={{ borderRadius: "8px" }}
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied!" : (label ?? "Copy")}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Capability labels
// ---------------------------------------------------------------------------

const CAPABILITY_LABELS: Record<string, string> = {
  "systems:read":          "View your systems",
  "schema:read":           "Export system schemas",
  "validation:read":       "Run validation reports",
  "graph:write":           "Add/edit nodes and pipes",
  "versions:write":        "Create version snapshots",
  "comments:write":        "Post comments on systems",
  "systems:write":         "Create/delete systems",
  "templates:read":        "Browse templates",
  "templates:instantiate": "Instantiate templates",
  "versions:read":         "Read version history",
  "import:write":          "Import schemas",
};

const RECOMMENDED = ["systems:read", "schema:read"];

// ---------------------------------------------------------------------------
// Page — one screen, one action
// ---------------------------------------------------------------------------

export default function ConnectPage() {
  const [origin, setOrigin] = useState("");
  const [name, setName] = useState("My Agent");
  const [capabilities, setCapabilities] = useState<string[]>(RECOMMENDED);
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [showCapabilities, setShowCapabilities] = useState(false);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const endpoint = `${origin}/api/protocol/mcp`;
  const displayToken = secret ?? "YOUR_TOKEN_HERE";
  const config = `{
  "mcpServers": {
    "pipes": {
      "url": "${endpoint}",
      "headers": {
        "Authorization": "Bearer ${displayToken}"
      }
    }
  }
}`;

  const toggle = (cap: string) =>
    setCapabilities((prev) => prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]);

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
        toast.success("Token created — copy it now, it won't be shown again");
      } else {
        toast.error(data.error ?? "Failed to create token");
      }
    } finally { setCreating(false); }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-10 space-y-8">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-indigo-600" />
          <h1 className="text-2xl font-bold text-[#111]" style={{ letterSpacing: "-0.03em" }}>
            Connect to an agent
          </h1>
        </div>
        <p className="t-label text-[#8E8E93]">
          One URL. Any AI that speaks MCP can read your systems immediately.
        </p>
      </div>

      {/* Section 1: Endpoint — always visible */}
      <div className="space-y-3">
        <div className="border border-indigo-200 bg-indigo-50 p-4 space-y-2" style={{ borderRadius: "12px" }}>
          <p className="t-caption font-bold text-indigo-600 uppercase tracking-wider">MCP Endpoint</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 t-label font-mono text-indigo-900 font-semibold break-all">{endpoint}</code>
            <CopyButton text={endpoint} />
          </div>
        </div>

        <div className="bg-[#111] overflow-hidden" style={{ borderRadius: "12px" }}>
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="t-caption font-bold uppercase tracking-widest text-[#8E8E93]">
              Claude Desktop · ~/.claude/config.json
            </span>
            <CopyButton text={config} />
          </div>
          <pre className="px-5 py-4 t-label font-mono text-green-400 leading-relaxed overflow-x-auto whitespace-pre-wrap">
            {config}
          </pre>
        </div>

        {!secret && (
          <p className="t-caption text-[#8E8E93]">
            Create a token below — the config above will update with your real token.
          </p>
        )}
      </div>

      {/* Section 2: Token creation */}
      {!secret ? (
        <div className="border border-black/[0.08] p-5 space-y-4" style={{ borderRadius: "12px" }}>
          <div>
            <p className="t-label font-bold text-[#111]">Create an agent token</p>
            <p className="t-caption text-[#8E8E93] mt-0.5">Grant your agent access. Default permissions are enough to get started.</p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Token name (e.g. Claude agent)"
              className="flex-1 h-10 border border-black/[0.08] px-3 t-label text-[#111] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
              style={{ borderRadius: "8px" }}
            />
            <Button
              variant="primary"
              onPress={handleCreate}
              isDisabled={creating || !name.trim() || capabilities.length === 0}
              className="h-10 px-5 font-semibold shrink-0"
            >
              {creating ? <Spinner size="sm" /> : <><Key className="w-3.5 h-3.5" /> Create</>}
            </Button>
          </div>

          <button
            onClick={() => setShowCapabilities((v) => !v)}
            className="t-caption text-[#8E8E93] hover:text-[#3C3C43] transition-colors"
          >
            {showCapabilities ? "Hide" : "Customize"} permissions →
          </button>

          {showCapabilities && (
            <div className="border border-black/[0.08] overflow-hidden" style={{ borderRadius: "10px" }}>
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
                      Default
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Token revealed */
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 p-4 space-y-3" style={{ borderRadius: "12px" }}>
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <p className="t-label font-bold">Token created — copy it now, it won't be shown again</p>
            </div>
            <div className="flex items-center gap-2 bg-[#111] px-4 py-3" style={{ borderRadius: "8px" }}>
              <code className="flex-1 t-caption font-mono text-green-400 break-all">{secret}</code>
              <CopyButton text={secret} />
            </div>
          </div>
          <p className="t-caption text-[#8E8E93]">
            The config above is now complete with your token. Copy it into Claude Desktop or your agent.
          </p>
        </div>
      )}

      {/* Section 3: What you can do — shown after token created */}
      {secret && (
        <div className="bg-[#111] p-5 space-y-3" style={{ borderRadius: "12px" }}>
          <p className="t-caption font-bold text-[#8E8E93] uppercase tracking-wider">What your agent can do now</p>
          <div className="space-y-2 mt-1">
            {[
              { tool: "export_system_schema",  desc: "Read the full schema of any system"   },
              { tool: "apply_graph_actions",   desc: "Add nodes and draw connections"        },
              { tool: "create_version",        desc: "Snapshot the current state"            },
              { tool: "get_validation_report", desc: "Check for errors and warnings"         },
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
