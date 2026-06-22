"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUp, Search, Star, X } from "lucide-react";

// MobileDashboard — the mobile-first dashboard. Not a port of desktop; a
// distinct surface for a touch user who wants to read or share what they
// already have and start a fresh system fast.

type LibraryRow = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  createdBy: string;
  favorite: boolean;
  tags: string[];
};

type LibraryPayload = {
  rows: LibraryRow[];
  recent: LibraryRow[];
  favorites: LibraryRow[];
  availableTags: string[];
};

// Starters used in the mobile dashboard. We only need three: the user is on a
// phone, decision fatigue is real. The labels match the desktop starter set
// so the conversation feels consistent across surfaces.
const MOBILE_STARTERS: Array<{ id: string; label: string; prompt: string }> = [
  {
    id: "customer-support-triage",
    label: "Support triage",
    prompt:
      "Build a customer support triage flow. An inbound ticket gets classified, a knowledge base lookup runs, a confidence check splits between auto-resolve and a specialist queue, and the result lands at an escalation handoff.",
  },
  {
    id: "code-review-assistant",
    label: "Code review",
    prompt:
      "Build a code review assistant. A PR webhook fires, a diff fetcher pulls the changes, a linter, a security scanner, and a style critic run in parallel, an aggregator merges the findings, and a comment poster replies on the PR.",
  },
  {
    id: "document-qa-system",
    label: "Document QA",
    prompt:
      "A user asks a question. A retriever pulls matching chunks from the docs index. An answering agent writes a grounded answer. A citation formatter attaches inline citations and the response goes back to the user.",
  },
];

// Tiny thumbnail SVG — 4 nodes maximum, illustrative only. The point is to
// signal "this is a system" not to render the real graph in 80x40 pixels.
type ThumbProps = { seed: string };

function CardThumbnail({ seed }: ThumbProps): React.ReactElement {
  // Stable hash so the same system always looks the same.
  const hash = seed.split("").reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 7);
  const variant = Math.abs(hash) % 3;
  const layouts: Array<Array<{ x: number; y: number }>> = [
    [
      { x: 8, y: 18 },
      { x: 40, y: 8 },
      { x: 40, y: 28 },
      { x: 72, y: 18 },
    ],
    [
      { x: 10, y: 10 },
      { x: 40, y: 22 },
      { x: 70, y: 10 },
      { x: 70, y: 30 },
    ],
    [
      { x: 10, y: 18 },
      { x: 32, y: 18 },
      { x: 54, y: 18 },
      { x: 76, y: 18 },
    ],
  ];
  const nodes = layouts[variant];
  const lines: Array<{ a: number; b: number }> = [
    { a: 0, b: 1 },
    { a: 0, b: 2 },
    { a: 1, b: 3 },
    { a: 2, b: 3 },
  ];
  return (
    <svg
      width={88}
      height={44}
      viewBox="0 0 88 44"
      role="img"
      aria-label="System preview"
      className="shrink-0"
    >
      {lines.map((l, i) => {
        const a = nodes[l.a];
        const b = nodes[l.b];
        return (
          <line
            key={`l-${i}`}
            x1={a.x + 8}
            y1={a.y + 4}
            x2={b.x}
            y2={b.y + 4}
            stroke="rgba(0,0,0,0.18)"
            strokeWidth={1}
          />
        );
      })}
      {nodes.map((n, i) => (
        <g key={`n-${i}`}>
          <rect x={n.x} y={n.y} width={16} height={8} rx={2} fill="#FFFFFF" stroke="rgba(0,0,0,0.18)" />
          <circle cx={n.x + 3} cy={n.y + 4} r={1.2} fill="#4F46E5" />
        </g>
      ))}
    </svg>
  );
}

export type MobileDashboardProps = {
  initialLibrary?: LibraryPayload;
  workspaceName?: string;
  userInitials?: string;
};

export function MobileDashboard({
  initialLibrary,
  workspaceName,
  userInitials,
}: MobileDashboardProps): React.ReactElement {
  const router = useRouter();
  const [library, setLibrary] = useState<LibraryPayload>(
    initialLibrary ?? { rows: [], recent: [], favorites: [], availableTags: [] },
  );
  const [query, setQuery] = useState<string>("");
  const [heroPrompt, setHeroPrompt] = useState<string>("");
  const [expanded, setExpanded] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const expandedInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Initial fetch when no payload was provided (mock-mode dev preview).
  useEffect(() => {
    if (initialLibrary) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/library?status=all&sort=recent_activity", { cache: "no-store" });
        const body = await res.json();
        if (cancelled) return;
        if (body.ok) setLibrary(body.data);
      } catch {
        // surface gently
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialLibrary]);

  // Search refresh.
  useEffect(() => {
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ status: "all", sort: "recent_activity" });
        if (query) params.set("q", query);
        const res = await fetch(`/api/library?${params}`, { cache: "no-store" });
        const body = await res.json();
        if (body.ok) setLibrary(body.data);
      } catch {
        // best-effort
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [query]);

  // When the full-screen prompt expands, focus the textarea on the next frame.
  useEffect(() => {
    if (!expanded) return;
    const id = requestAnimationFrame(() => {
      expandedInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [expanded]);

  const refreshLibrary = useCallback(async () => {
    try {
      const res = await fetch("/api/library?status=all&sort=recent_activity", { cache: "no-store" });
      const body = await res.json();
      if (body.ok) setLibrary(body.data);
    } catch {
      // best-effort
    }
  }, []);

  const handleToggleFavorite = useCallback(
    async (row: LibraryRow, e: React.MouseEvent) => {
      e.stopPropagation();
      const next = !row.favorite;
      try {
        const res = await fetch("/api/library", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "favorite", systemId: row.id, favorite: next }),
        });
        if (!res.ok) throw new Error();
        toast.success(next ? "Added to favorites" : "Removed from favorites");
        void refreshLibrary();
      } catch {
        toast.error("Failed to update favorites");
      }
    },
    [refreshLibrary],
  );

  const startSystem = useCallback(
    async (prompt: string) => {
      const text = prompt.trim();
      if (!text || submitting) return;
      setSubmitting(true);
      const tid = toast.loading("Creating system...");
      try {
        const res = await fetch("/api/systems", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Untitled System" }),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("Building...", { id: tid });
          router.push(`/systems/${data.data.systemId}?prompt=${encodeURIComponent(text)}`);
        } else {
          toast.error(data.error ?? "Could not create system", { id: tid });
        }
      } catch {
        toast.error("Could not create system", { id: tid });
      } finally {
        setSubmitting(false);
      }
    },
    [router, submitting],
  );

  const rows = useMemo(() => {
    return library.rows.filter((r) => !r.archivedAt);
  }, [library.rows]);

  return (
    <div className="min-h-screen bg-white flex flex-col" data-testid="mobile-dashboard">
      {/* Top bar — workspace + avatar */}
      <header
        className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-black/[0.06] px-4 flex items-center gap-3"
        style={{ height: 56, paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="min-w-0 flex-1">
          <p className="t-caption text-[#8E8E93] leading-none">Workspace</p>
          <p className="t-label font-semibold text-[#111] truncate leading-tight">
            {workspaceName ?? "Your workspace"}
          </p>
        </div>
        <span
          aria-label="Account"
          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#F5F5F7] text-[#3C3C43] t-label font-semibold"
        >
          {userInitials ?? "U"}
        </span>
      </header>

      <main className="flex-1 px-4 pt-4 pb-10 flex flex-col gap-6">
        {/* Hero — describe your system */}
        <section
          aria-label="Start a system"
          className="rounded-2xl p-4 border border-black/[0.06] bg-gradient-to-br from-indigo-50 to-white"
        >
          <h1 className="t-h2 text-[#111] leading-tight">Describe your system.</h1>
          <p className="t-body text-[#3C3C43] mt-1">Watch it build itself.</p>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-3 w-full text-left t-label text-[#8E8E93] bg-white border border-black/[0.08] rounded-xl px-3 py-3 min-h-[48px]"
          >
            A planner reads tickets, a guard checks policy, a coder opens a PR...
          </button>
          <div className="mt-3 flex gap-2 overflow-x-auto -mx-1 px-1 scrollbar-thin">
            {MOBILE_STARTERS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  setHeroPrompt(chip.prompt);
                  setExpanded(true);
                }}
                className="shrink-0 t-label text-[#3C3C43] bg-white border border-black/[0.08] hover:border-black/[0.16] active:bg-black/[0.04] rounded-full px-3 min-h-[36px] transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </section>

        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search systems"
            aria-label="Search systems"
            className="w-full pl-9 pr-3 h-11 rounded-xl border border-black/[0.08] bg-white t-label text-[#111] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Your systems */}
        <section aria-label="Your systems">
          <h2 className="t-overline text-[#8E8E93] mb-2">Your systems</h2>
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/[0.12] p-5 text-center">
              <p className="t-label text-[#3C3C43]">No systems yet.</p>
              <p className="t-caption text-[#8E8E93] mt-1">
                Describe one above and watch it build.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2" data-testid="mobile-dashboard-system-list">
              {rows.map((row) => (
                <li key={row.id}>
                  <div className="w-full flex items-center gap-3 bg-white border border-black/[0.08] hover:border-indigo-300 rounded-xl px-3 py-3 min-h-[68px] transition-colors">
                    <button
                      type="button"
                      onClick={() => router.push(`/systems/${row.id}`)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left active:opacity-70"
                      aria-label={`Open ${row.name}`}
                    >
                      <CardThumbnail seed={row.id} />
                      <div className="min-w-0 flex-1">
                        <p className="t-label font-semibold text-[#111] truncate">{row.name}</p>
                        <p className="t-caption text-[#8E8E93] truncate">
                          {row.description || <span className="italic opacity-50">No description</span>}
                        </p>
                        {row.tags.length > 0 && (
                          <div className="flex gap-1 mt-1 overflow-hidden">
                            {row.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="shrink-0 inline-block px-1.5 py-0 rounded-full bg-[#F5F5F7] t-caption text-[#8E8E93] text-[10px]"
                              >
                                {tag}
                              </span>
                            ))}
                            {row.tags.length > 3 && (
                              <span className="shrink-0 t-caption text-[#C7C7CC] text-[10px]">
                                +{row.tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => void handleToggleFavorite(row, e)}
                      aria-label={row.favorite ? "Remove from favorites" : "Add to favorites"}
                      className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors active:bg-black/[0.06]"
                    >
                      <Star
                        size={18}
                        className={
                          row.favorite
                            ? "text-[#3C3C43] fill-[#3C3C43]"
                            : "text-[#C7C7CC]"
                        }
                      />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* Expanded prompt modal */}
      {expanded ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Describe your system"
          className="fixed inset-0 z-50 bg-white flex flex-col"
          style={{
            paddingTop: "env(safe-area-inset-top, 0px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
          data-testid="mobile-dashboard-prompt-modal"
        >
          <div className="flex items-center justify-between px-4" style={{ height: 56 }}>
            <p className="t-label font-semibold text-[#111]">Describe your system</p>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Close"
              className="inline-flex items-center justify-center w-11 h-11 -mr-1 rounded-full text-[#3C3C43] hover:bg-black/[0.05] active:bg-black/[0.08] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 px-4 pt-2 flex flex-col">
            <textarea
              ref={expandedInputRef}
              value={heroPrompt}
              onChange={(e) => setHeroPrompt(e.target.value)}
              placeholder="A planner reads tickets, a guard checks policy, a coder opens a PR..."
              aria-label="System description"
              className="flex-1 w-full resize-none t-body text-[#111] placeholder:text-[#8E8E93] outline-none border-none bg-transparent"
            />
          </div>
          <div className="px-4 py-3 border-t border-black/[0.06]">
            <button
              type="button"
              onClick={() => void startSystem(heroPrompt)}
              disabled={!heroPrompt.trim() || submitting}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-300 text-white t-label font-medium rounded-xl px-3 transition-colors"
            >
              <ArrowUp size={16} />
              {submitting ? "Starting..." : "Start"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
