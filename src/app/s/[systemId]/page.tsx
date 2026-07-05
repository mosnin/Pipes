import { notFound } from "next/navigation";
import Link from "next/link";
import { store } from "@/lib/convex/store";
import type { Metadata } from "next";

type Params = { params: Promise<{ systemId: string }> };

const NODE_TYPE_COLOR: Record<string, string> = {
  Agent: "bg-indigo-100 text-indigo-700",
  Tool: "bg-violet-100 text-violet-700",
  Model: "bg-blue-100 text-blue-700",
  Prompt: "bg-sky-100 text-sky-700",
  Memory: "bg-amber-100 text-amber-700",
  Input: "bg-emerald-100 text-emerald-700",
  Output: "bg-green-100 text-green-700",
  Action: "bg-orange-100 text-orange-700",
  Decision: "bg-yellow-100 text-yellow-700",
  Condition: "bg-lime-100 text-lime-700",
  Router: "bg-teal-100 text-teal-700",
  Loop: "bg-cyan-100 text-cyan-700",
  Queue: "bg-rose-100 text-rose-700",
  Datastore: "bg-pink-100 text-pink-700",
  ExternalApi: "bg-fuchsia-100 text-fuchsia-700",
  HumanApproval: "bg-red-100 text-red-700",
  Guardrail: "bg-red-100 text-red-800",
  Monitor: "bg-slate-100 text-slate-700",
  Trigger: "bg-purple-100 text-purple-700",
  Schedule: "bg-indigo-100 text-indigo-600",
  Evaluator: "bg-blue-100 text-blue-600",
  HumanReview: "bg-rose-100 text-rose-700",
};

function getNodeColor(type: string): string {
  return NODE_TYPE_COLOR[type] ?? "bg-[#F5F5F7] text-[#3C3C43]";
}

function getSystemData(systemId: string) {
  const db = store.readDb();
  const system = db.systems.find((s) => s.id === systemId && !s.archivedAt);
  if (!system || system.visibility === "private") return null;

  const nodes = db.nodes
    .filter((n) => n.systemId === systemId)
    .map((n) => ({ id: n.id, type: n.type, title: n.title, description: n.description }));

  const pipeCount = db.pipes.filter((p) => p.systemId === systemId).length;

  return { system, nodes, pipeCount };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { systemId } = await params;
  const data = getSystemData(systemId);
  if (!data) return { title: "Loop not found — Pipes" };
  return {
    title: `${data.system.name} — Pipes`,
    description: data.system.description || `A loop with ${data.nodes.length} nodes built in Pipes.`,
  };
}

export default async function PublicSystemPage({ params }: Params) {
  const { systemId } = await params;
  const data = getSystemData(systemId);
  if (!data) notFound();

  const { system, nodes, pipeCount } = data;
  const visibleNodes = nodes.slice(0, 16);
  const overflow = nodes.length - visibleNodes.length;

  const nodeTypeCounts = nodes.reduce<Record<string, number>>((acc, n) => {
    acc[n.type] = (acc[n.type] ?? 0) + 1;
    return acc;
  }, {});

  const topTypes = Object.entries(nodeTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Top bar */}
      <header className="border-b border-black/[0.06] bg-white px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[#111]">
          <div className="w-6 h-6 rounded-md bg-[#4F46E5] flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">L</span>
          </div>
          Pipes
        </Link>
        <Link
          href="/signup"
          className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#4F46E5] text-white hover:bg-[#4338CA] transition-colors"
        >
          Build your own
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* System header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-[11px] font-semibold text-indigo-600 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Public loop
          </div>
          <h1 className="text-3xl font-bold text-[#111] mb-3 leading-tight">{system.name}</h1>
          {system.description && (
            <p className="text-[#3C3C43] text-base leading-relaxed max-w-xl">{system.description}</p>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-black/[0.06]">
          <div>
            <p className="text-2xl font-bold text-[#111]">{nodes.length}</p>
            <p className="text-xs text-[#8E8E93] mt-0.5">nodes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#111]">{pipeCount}</p>
            <p className="text-xs text-[#8E8E93] mt-0.5">connections</p>
          </div>
          {topTypes.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {topTypes.map(([type]) => (
                <span
                  key={type}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${getNodeColor(type)}`}
                >
                  {type}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Node grid */}
        {nodes.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-[#111] mb-4">Nodes in this loop</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {visibleNodes.map((node) => (
                <div
                  key={node.id}
                  className="flex items-start gap-3 p-3 bg-white border border-black/[0.06] rounded-xl"
                >
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 mt-0.5 ${getNodeColor(node.type)}`}
                  >
                    {node.type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#111] truncate">{node.title}</p>
                    {node.description && (
                      <p className="text-[11px] text-[#8E8E93] mt-0.5 line-clamp-1">{node.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {overflow > 0 && (
              <p className="text-xs text-[#8E8E93] mt-3">
                +{overflow} more {overflow === 1 ? "node" : "nodes"} — open in Pipes to see all
              </p>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 text-center">
          <h3 className="text-base font-semibold text-indigo-900 mb-1">Build loops like this</h3>
          <p className="text-sm text-indigo-700 mb-4">
            Pipes is a visual canvas for designing agent loops that your team and AI both understand.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="px-5 py-2 rounded-full bg-[#4F46E5] text-white text-sm font-semibold hover:bg-[#4338CA] transition-colors"
            >
              Start for free
            </Link>
            <Link
              href="/templates"
              className="px-5 py-2 rounded-full bg-white border border-indigo-200 text-[#4F46E5] text-sm font-semibold hover:bg-indigo-50 transition-colors"
            >
              Browse templates
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
