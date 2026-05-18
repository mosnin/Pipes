"use client";

import { useState } from "react";
import { Accordion, Button, Card, Chip, Separator, Tabs } from "@heroui/react";
import Link from "next/link";

// ─── Data ─────────────────────────────────────────────────────────────────────

const REST_ENDPOINTS = [
  { method: "GET",  path: "/api/protocol/systems",                         desc: "List all systems" },
  { method: "GET",  path: "/api/protocol/systems/:id",                     desc: "Get a system by ID" },
  { method: "GET",  path: "/api/protocol/systems/:id/schema",              desc: "Export system schema" },
  { method: "GET",  path: "/api/protocol/systems/:id/versions",            desc: "List versions" },
  { method: "GET",  path: "/api/protocol/systems/:id/validation",          desc: "Get validation report" },
  { method: "GET",  path: "/api/protocol/templates",                       desc: "List templates" },
  { method: "POST", path: "/api/protocol/systems",                         desc: "Create a system" },
  { method: "POST", path: "/api/protocol/templates/:id/instantiate",       desc: "Instantiate a template" },
  { method: "POST", path: "/api/protocol/import/system",                   desc: "Import system from schema" },
  { method: "POST", path: "/api/protocol/systems/:id/versions",            desc: "Create a version" },
  { method: "POST", path: "/api/protocol/graph",                           desc: "Apply graph actions" },
  { method: "POST", path: "/api/protocol/comments",                        desc: "Add a comment" },
] as const;

const MCP_TOOLS = [
  { name: "list_systems",              desc: "List all systems in the workspace" },
  { name: "get_system",               desc: "Fetch a single system by ID" },
  { name: "export_system_schema",     desc: "Export a system as Pipes Schema v1 JSON" },
  { name: "list_templates",           desc: "List available system templates" },
  { name: "instantiate_template",     desc: "Create a system from a template" },
  { name: "create_system_from_schema",desc: "Import a system from raw schema" },
  { name: "create_version",          desc: "Snapshot the current state as a version" },
  { name: "apply_graph_actions",     desc: "Mutate the graph (nodes, pipes, ports)" },
  { name: "add_comment",             desc: "Annotate a system with a comment" },
  { name: "get_validation_report",   desc: "Run validation and return structured results" },
] as const;

const CAPABILITIES = [
  { cap: "systems:read",   desc: "Read systems and their schemas",      plan: "Pro+" },
  { cap: "systems:write",  desc: "Create and mutate systems",           plan: "Pro+" },
  { cap: "schema:read",    desc: "Export Pipes Schema v1 payloads",     plan: "Pro+" },
  { cap: "templates:read", desc: "List and instantiate templates",      plan: "Pro+" },
  { cap: "versions:write", desc: "Create and list version snapshots",   plan: "Pro+" },
  { cap: "comments:write", desc: "Add comments to systems",             plan: "Pro+" },
  { cap: "graph:write",    desc: "Apply graph-level mutations",         plan: "Builder" },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProtocolPage() {
  const [tab, setTab] = useState("rest");

  return (
    <div className="min-h-screen bg-white">

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section className="pt-20 pb-14 px-6 text-center bg-gradient-to-b from-slate-50 to-white">
        <div className="flex items-center justify-center gap-2 mb-5">
          <Chip variant="soft" color="default">REST API</Chip>
          <Chip variant="soft" color="accent">MCP</Chip>
        </div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Pipes Protocol</h1>
        <p className="mt-3 text-lg text-slate-600 max-w-xl mx-auto">
          Token-authenticated REST and MCP transports over the same bounded services.
          Connect agents, CI pipelines, and external tools to your system contracts.
        </p>
        <div className="mt-7">
          <Link href="/settings/tokens">
            <Button variant="primary" className="font-semibold px-6">Create API token</Button>
          </Link>
        </div>
      </section>

      <Separator />

      {/* ── 2. ENDPOINTS TABS ───────────────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Endpoints</h2>
          <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(String(k))}>
            <Tabs.List>
              <Tabs.Tab id="rest">REST</Tabs.Tab>
              <Tabs.Tab id="mcp">MCP</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel id="rest" className="mt-6">
              <div className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                {REST_ENDPOINTS.map((ep) => (
                  <div key={ep.path} className="flex items-start gap-3 px-5 py-3.5 bg-white hover:bg-slate-50">
                    <Chip
                      size="sm"
                      variant={ep.method === "GET" ? "soft" : "secondary"}
                      color={ep.method === "GET" ? "success" : "accent"}
                      className="shrink-0 font-mono text-xs font-bold w-14 justify-center"
                    >
                      {ep.method}
                    </Chip>
                    <code className="text-sm text-slate-700 font-mono flex-1">{ep.path}</code>
                    <span className="text-sm text-slate-500 text-right hidden sm:block">{ep.desc}</span>
                  </div>
                ))}
              </div>
            </Tabs.Panel>

            <Tabs.Panel id="mcp" className="mt-6">
              <p className="text-sm text-slate-500 mb-4">
                Endpoint: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">POST /api/protocol/mcp</code>
                {" — "}body: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{"{ \"tool\": \"...\", \"input\": {} }"}</code>
              </p>
              <div className="flex flex-col divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                {MCP_TOOLS.map((tool) => (
                  <div key={tool.name} className="flex items-center gap-3 px-5 py-3.5 bg-white hover:bg-slate-50">
                    <code className="text-sm font-mono text-indigo-600 w-56 shrink-0">{tool.name}</code>
                    <span className="text-sm text-slate-500">{tool.desc}</span>
                  </div>
                ))}
              </div>
            </Tabs.Panel>
          </Tabs>
        </div>
      </section>

      <Separator />

      {/* ── 3. AUTH ─────────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Authentication</h2>
          <p className="text-slate-500 mb-6 text-sm">
            All protocol routes require a token. Tokens start with <code className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded">ptk_</code> and are scoped to specific capabilities.
          </p>
          <Card className="border border-slate-200 shadow-sm">
            <Card.Content className="p-0">
              <pre className="text-sm font-mono text-slate-700 bg-slate-900 text-green-300 p-5 rounded-xl overflow-x-auto leading-relaxed">{`Authorization: Bearer ptk_...

# Example
curl https://app.pipes.dev/api/protocol/systems \\
  -H 'Authorization: Bearer ptk_your_token_here'`}</pre>
            </Card.Content>
          </Card>
          <p className="mt-4 text-sm text-slate-500">
            Idempotent write routes also accept an <code className="font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded">Idempotency-Key</code> header.
            Rate limits: <strong>120 reads/min</strong>, <strong>60 writes/min</strong>, <strong>120 MCP calls/min</strong>.
          </p>
        </div>
      </section>

      <Separator />

      {/* ── 4. CAPABILITIES TABLE ───────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Capabilities</h2>
          <p className="text-slate-500 mb-6 text-sm">
            Assign one or more capabilities when creating a token. The token can only perform actions within its granted scope.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Capability</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Description</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Plan</th>
                </tr>
              </thead>
              <tbody>
                {CAPABILITIES.map((row, idx) => (
                  <tr key={row.cap} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                    <td className="px-5 py-3 font-mono text-indigo-600">{row.cap}</td>
                    <td className="px-5 py-3 text-slate-600">{row.desc}</td>
                    <td className="px-5 py-3">
                      <Chip size="sm" variant="soft" color={row.plan === "Builder" ? "warning" : "default"}>
                        {row.plan}
                      </Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

    </div>
  );
}
