"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@heroui/react";
import { Mail, Trash2, UserPlus, Users } from "lucide-react";
import {
  Button,
  CardShell,
  CardHeader,
  CardBody,
  DataTable,
  Dialog,
  EmptyState,
  HelpText,
  PageHeader,
  SearchInput,
  SegmentedControl,
  Spinner,
  StatusBadge,
  type DataTableColumn,
  type StatusBadgeTone,
} from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Role = "Viewer" | "Commenter" | "Editor" | "Admin" | "Owner";

interface Member {
  userId: string;
  name?: string;
  email?: string;
  role: Role;
  joinedAt?: string;
  lastActiveAt?: string;
}

interface Invite {
  token: string;
  email: string;
  role: Role;
  status: string;
  expiresAt?: string;
}

interface CollaboratorsData {
  members: Member[];
  invites: Invite[];
  teams?: Array<{ id: string; name: string; memberCount: number }>;
}

type RowMember = Member & { id: string };
type RowInvite = Invite & { id: string };

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const ROLES: Role[] = ["Viewer", "Commenter", "Editor", "Admin"];

const ROLE_TONE: Record<Role, StatusBadgeTone> = {
  Owner:     "info",
  Admin:     "warning",
  Editor:    "info",
  Commenter: "neutral",
  Viewer:    "neutral",
};

function getInitials(member: Member): string {
  if (member.name) {
    return member.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  const label = member.email ?? member.userId ?? "?";
  return label.slice(0, 2).toUpperCase();
}

function formatDate(value?: string): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function relativeTime(iso?: string): string {
  if (!iso) return "-";
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const abs = Math.abs(diff);
    if (abs < 60_000) return "just now";
    if (abs < 3_600_000) return `${Math.floor(abs / 60_000)} min ago`;
    if (abs < 86_400_000) return `${Math.floor(abs / 3_600_000)} hr ago`;
    return `${Math.floor(abs / 86_400_000)} d ago`;
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CollaborationSettingsPage() {
  const [rows, setRows] = useState<CollaboratorsData>({ members: [], invites: [] });
  const [query, setQuery]           = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [loading, setLoading]       = useState(true);

  // ── Invite dialog ─────────────────────────────────────────────────────────
  const [inviteOpen, setInviteOpen]         = useState(false);
  const [email, setEmail]                   = useState("");
  const [inviteRole, setInviteRole]         = useState<Role>("Viewer");
  const [inviteLoading, setInviteLoading]   = useState(false);
  const [emailTouched, setEmailTouched]     = useState(false);

  const emailError =
    emailTouched && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? "Enter a valid email address"
      : emailTouched && !email.trim()
      ? "Email is required"
      : null;

  // ── Remove member dialog ──────────────────────────────────────────────────
  const [removeTarget, setRemoveTarget]     = useState<Member | null>(null);
  const [removeLoading, setRemoveLoading]   = useState(false);

  // ── Cancel-invite tracking ────────────────────────────────────────────────
  const [cancellingTokens, setCancellingTokens] = useState<Set<string>>(new Set());

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (roleFilter && roleFilter !== "all") params.set("role", roleFilter);
    setLoading(true);
    fetch(`/api/workspace/collaborators?${params.toString()}`)
      .then((r) => r.json())
      .then((d: { data?: CollaboratorsData }) =>
        setRows(d.data ?? { members: [], invites: [] }),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [query, roleFilter]);

  useEffect(() => {
    const timer = setTimeout(() => load(), 220);
    return () => clearTimeout(timer);
  }, [load]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const pendingInvites = useMemo(
    () => (rows.invites ?? []).filter((i) => i.status === "pending"),
    [rows.invites],
  );

  const memberRows: RowMember[] = useMemo(
    () => rows.members.map((m) => ({ ...m, id: m.userId })),
    [rows.members],
  );

  const inviteRows: RowInvite[] = useMemo(
    () => pendingInvites.map((i) => ({ ...i, id: i.token })),
    [pendingInvites],
  );

  // ── Invite ────────────────────────────────────────────────────────────────
  async function handleSendInvite() {
    setEmailTouched(true);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return;
    setInviteLoading(true);
    const target = email.trim();
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: target, role: inviteRole }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setEmail("");
      setInviteRole("Viewer");
      setEmailTouched(false);
      setInviteOpen(false);
      load();
      toast.success(`Invite sent to ${target}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send invite.");
    } finally {
      setInviteLoading(false);
    }
  }

  // ── Remove member ─────────────────────────────────────────────────────────
  async function confirmRemove() {
    if (!removeTarget) return;
    setRemoveLoading(true);
    try {
      const res = await fetch("/api/workspace/collaborators", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: removeTarget.userId,
          role: "Viewer",
          remove: true,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      load();
      toast.success("Member removed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member.");
    } finally {
      setRemoveLoading(false);
      setRemoveTarget(null);
    }
  }

  // ── Cancel invite ─────────────────────────────────────────────────────────
  async function handleCancelInvite(token: string) {
    setCancellingTokens((prev) => new Set(prev).add(token));
    try {
      const res = await fetch(`/api/invites/${token}/cancel`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      load();
      toast.success("Invite cancelled");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel invite.");
    } finally {
      setCancellingTokens((prev) => {
        const next = new Set(prev);
        next.delete(token);
        return next;
      });
    }
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  const memberColumns: DataTableColumn<RowMember>[] = [
    {
      key: "name",
      header: "Member",
      render: (row) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar size="sm" className="shrink-0">
            <Avatar.Fallback>{getInitials(row)}</Avatar.Fallback>
          </Avatar>
          <div className="min-w-0">
            <div className="t-label font-medium text-[#111] truncate">
              {row.name ?? row.email ?? row.userId}
            </div>
            {row.name && row.email && (
              <div className="t-caption text-[#8E8E93] truncate">{row.email}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (row) => (
        <span className="t-label text-[#3C3C43] truncate">{row.email ?? "-"}</span>
      ),
    },
    {
      key: "role",
      header: "Role",
      width: "120px",
      render: (row) => (
        <StatusBadge tone={ROLE_TONE[row.role]}>{row.role}</StatusBadge>
      ),
    },
    {
      key: "joinedAt",
      header: "Joined",
      width: "120px",
      render: (row) => (
        <span className="t-caption text-[#8E8E93]">{formatDate(row.joinedAt)}</span>
      ),
    },
    {
      key: "lastActiveAt",
      header: "Last active",
      width: "120px",
      render: (row) => (
        <span className="t-caption text-[#8E8E93]">{relativeTime(row.lastActiveAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "80px",
      align: "right",
      render: (row) =>
        row.role === "Owner" ? (
          <span className="t-caption text-[#C7C7CC]">-</span>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            onPress={() => setRemoveTarget(row)}
            className="text-[#991B1B] hover:bg-[#FEF2F2]"
            aria-label={`Remove ${row.name ?? row.email ?? row.userId}`}
          >
            <Trash2 size={13} />
          </Button>
        ),
    },
  ];

  const inviteColumns: DataTableColumn<RowInvite>[] = [
    {
      key: "email",
      header: "Email",
      render: (row) => <span className="t-label text-[#111]">{row.email}</span>,
    },
    {
      key: "role",
      header: "Role",
      width: "120px",
      render: (row) => <StatusBadge tone={ROLE_TONE[row.role]}>{row.role}</StatusBadge>,
    },
    {
      key: "expiresAt",
      header: "Expires",
      width: "140px",
      render: (row) => (
        <span className="t-caption text-[#8E8E93]">{formatDate(row.expiresAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "120px",
      align: "right",
      render: (row) => (
        <Button
          size="sm"
          variant="danger-soft"
          isDisabled={cancellingTokens.has(row.token)}
          onPress={() => void handleCancelInvite(row.token)}
        >
          {cancellingTokens.has(row.token) ? <Spinner size="sm" /> : null}
          Cancel
        </Button>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <PageHeader
        title="Members and teams"
        subtitle="Manage who can view, comment on, and edit this workspace."
        actions={
          <Button
            variant="primary"
            onPress={() => setInviteOpen(true)}
            className="flex items-center gap-1.5"
          >
            <UserPlus size={14} />
            Invite member
          </Button>
        }
      />

      {/* ── Members ────────────────────────────────────────────────────────── */}
      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="t-title text-[#111]">Members</h2>
              <p className="mt-1 t-caption text-[#8E8E93]">
                {rows.members.length} active member{rows.members.length === 1 ? "" : "s"} in this workspace.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search by name or email"
              className="max-w-xs"
            />
            <SegmentedControl
              size="sm"
              value={roleFilter}
              onChange={setRoleFilter}
              items={[
                { id: "all",       label: "All" },
                { id: "Owner",     label: "Owner" },
                { id: "Admin",     label: "Admin" },
                { id: "Editor",    label: "Editor" },
                { id: "Commenter", label: "Commenter" },
                { id: "Viewer",    label: "Viewer" },
              ]}
            />
          </div>
        </CardBody>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" />
          </div>
        ) : memberRows.length === 0 ? (
          <CardBody>
            <EmptyState
              title="No members"
              description="Invite teammates to collaborate on systems."
              action={
                <Button
                  variant="primary"
                  onPress={() => setInviteOpen(true)}
                  className="flex items-center gap-1.5"
                >
                  <UserPlus size={14} />
                  Invite member
                </Button>
              }
            />
          </CardBody>
        ) : (
          <DataTable columns={memberColumns} rows={memberRows} />
        )}
      </CardShell>

      {/* ── Pending invites ───────────────────────────────────────────────── */}
      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="t-title text-[#111] flex items-center gap-2">
                <Mail size={14} className="text-[#8E8E93]" />
                Pending invites
              </h2>
              <p className="mt-1 t-caption text-[#8E8E93]">
                Invites awaiting acceptance.
              </p>
            </div>
            {inviteRows.length > 0 && (
              <StatusBadge tone="warning">{inviteRows.length} pending</StatusBadge>
            )}
          </div>
        </CardHeader>
        {inviteRows.length === 0 ? (
          <CardBody>
            <EmptyState
              title="No pending invites"
              description="Invitations you send will appear here until accepted or cancelled."
            />
          </CardBody>
        ) : (
          <DataTable columns={inviteColumns} rows={inviteRows} />
        )}
      </CardShell>

      {/* ── Teams ─────────────────────────────────────────────────────────── */}
      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center gap-2">
            <Users size={14} className="text-[#8E8E93]" />
            <h2 className="t-title text-[#111]">Teams</h2>
          </div>
          <p className="mt-1 t-caption text-[#8E8E93]">
            Group members for shared access patterns.
          </p>
        </CardHeader>
        <CardBody>
          {rows.teams && rows.teams.length > 0 ? (
            <ul className="divide-y divide-[var(--color-line)]">
              {rows.teams.map((team) => (
                <li
                  key={team.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <div className="t-label font-medium text-[#111]">{team.name}</div>
                    <HelpText>
                      {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
                    </HelpText>
                  </div>
                  <Button variant="ghost">Manage</Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No teams yet"
              description="Teams let you grant access to groups instead of individuals. Coming soon."
            />
          )}
        </CardBody>
      </CardShell>

      {/* ── Invite dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(o) => {
          setInviteOpen(o);
          if (!o) {
            setEmail("");
            setEmailTouched(false);
            setInviteRole("Viewer");
          }
        }}
        title="Invite a member"
        description="Send an invite to add a new member to this workspace."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onPress={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              isDisabled={inviteLoading}
              onPress={() => void handleSendInvite()}
              className="flex items-center gap-1.5"
            >
              {inviteLoading ? <Spinner size="sm" /> : <UserPlus size={14} />}
              Send invite
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-email" className="t-label font-medium text-[#111]">
              Email address
            </label>
            <input
              id="invite-email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailTouched(true);
              }}
              onBlur={() => setEmailTouched(true)}
              onKeyDown={(e) => e.key === "Enter" && void handleSendInvite()}
              className={
                emailError
                  ? "w-full h-10 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 t-label text-[#991B1B] outline-none focus:ring-2 focus:ring-red-100"
                  : "w-full h-10 rounded-lg border border-black/[0.08] bg-white px-3 t-label text-[#111] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              }
            />
            {emailError && <HelpText tone="error">{emailError}</HelpText>}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="invite-role" className="t-label font-medium text-[#111]">
              Role
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="w-full h-10 rounded-lg border border-black/[0.08] bg-white px-3 t-label text-[#111] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <HelpText>You can change a member&apos;s role at any time.</HelpText>
          </div>
        </div>
      </Dialog>

      {/* ── Remove dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={removeTarget != null}
        onOpenChange={(o) => {
          if (!o) setRemoveTarget(null);
        }}
        title="Remove member?"
        description="This member will lose access to this workspace immediately."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onPress={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              isDisabled={removeLoading}
              onPress={() => void confirmRemove()}
              className="flex items-center gap-1.5"
            >
              {removeLoading ? <Spinner size="sm" /> : <Trash2 size={14} />}
              Remove
            </Button>
          </>
        }
      >
        {removeTarget && (
          <p className="t-label text-[#3C3C43]">
            Remove{" "}
            <span className="font-semibold text-[#111]">
              {removeTarget.name ?? removeTarget.email ?? removeTarget.userId}
            </span>{" "}
            from this workspace?
          </p>
        )}
      </Dialog>
    </div>
  );
}

