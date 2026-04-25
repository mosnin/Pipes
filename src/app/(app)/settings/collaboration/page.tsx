"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Chip,
  ListBox,
  ListBoxItem,
  ModalBackdrop,
  ModalBody,
  ModalContainer,
  ModalDialog,
  ModalFooter,
  ModalHeader,
  ModalRoot,
  SelectIndicator,
  SelectPopover,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableContent,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { useOverlayState } from "@heroui/react";
import { Mail, UserPlus, Users } from "lucide-react";
import { SettingsShell } from "@/components/settings/SettingsShell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Role = "Viewer" | "Commenter" | "Editor" | "Admin" | "Owner";

interface Member {
  userId: string;
  name?: string;
  email?: string;
  role: Role;
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
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLES: Role[] = ["Viewer", "Commenter", "Editor", "Admin"];

// HeroUI v3 chip colors: "accent" | "danger" | "default" | "success" | "warning"
const ROLE_CHIP_COLOR: Record<Role, "warning" | "accent" | "default" | "success"> = {
  Admin:     "warning",
  Editor:    "accent",
  Commenter: "default",
  Viewer:    "default",
  Owner:     "success",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function formatExpiry(expiresAt?: string): string {
  if (!expiresAt) return "—";
  try {
    return new Date(expiresAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return expiresAt;
  }
}

// ---------------------------------------------------------------------------
// RoleSelect — compound HeroUI v3 Select for picking a Role
// ---------------------------------------------------------------------------

interface RoleSelectProps {
  value: Role;
  onChange: (role: Role) => void;
  options?: Role[];
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

function RoleSelect({
  value,
  onChange,
  options = ROLES,
  label = "Select role",
  className,
}: RoleSelectProps) {
  return (
    <SelectRoot<{ id: Role; label: Role }>
      aria-label={label}
      selectedKey={value}
      onSelectionChange={(key) => {
        if (key) onChange(key as Role);
      }}
      className={className}
    >
      <SelectTrigger className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm outline-none hover:border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 data-[placeholder]:text-slate-400">
        <SelectValue className="flex-1 text-left" />
        <SelectIndicator className="text-slate-400 shrink-0" />
      </SelectTrigger>
      <SelectPopover>
        <ListBox
          className="rounded-lg border border-slate-200 bg-white shadow-lg py-1 outline-none"
          aria-label={label}
        >
          {options.map((r) => (
            <ListBoxItem
              key={r}
              id={r}
              textValue={r}
              className="px-3 py-1.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 outline-none data-[focused]:bg-indigo-50 data-[focused]:text-indigo-700 data-[selected]:font-medium data-[selected]:text-indigo-700"
            >
              {r}
            </ListBoxItem>
          ))}
        </ListBox>
      </SelectPopover>
    </SelectRoot>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CollaborationSettingsPage() {
  // ── Data ─────────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<CollaboratorsData>({ members: [], invites: [] });

  // ── Invite form ──────────────────────────────────────────────────────────
  const [email, setEmail]               = useState("");
  const [inviteRole, setInviteRole]     = useState<Role>("Viewer");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [inviteError, setInviteError]   = useState("");
  const [invitedEmail, setInvitedEmail] = useState(""); // captured before clearing

  // ── Search / filter ──────────────────────────────────────────────────────
  const [query, setQuery]           = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // ── Role-change modal ────────────────────────────────────────────────────
  const [pendingChange, setPendingChange] = useState<{
    member: Member;
    newRole: Role;
  } | null>(null);
  const [changeLoading, setChangeLoading] = useState(false);

  // When the modal closes for any reason (backdrop click, Escape, Cancel),
  // reset the row select back to the member's current role.
  const modalState = useOverlayState({
    onOpenChange(isOpen) {
      if (!isOpen && pendingChange) {
        setRowRoles((prev) => ({
          ...prev,
          [pendingChange.member.userId]: pendingChange.member.role,
        }));
        setPendingChange(null);
      }
    },
  });

  // ── Cancel-invite loading map ─────────────────────────────────────────────
  const [cancellingTokens, setCancellingTokens] = useState<Set<string>>(new Set());

  // ── Per-row role select state ─────────────────────────────────────────────
  const [rowRoles, setRowRoles] = useState<Record<string, Role>>({});

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (roleFilter && roleFilter !== "all") params.set("role", roleFilter);
    fetch(`/api/workspace/collaborators?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setRows(d.data ?? { members: [], invites: [] }))
      .catch(() => {});
  }, [query, roleFilter]);

  // Initial load
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced reload on query / filter change
  useEffect(() => {
    const timer = setTimeout(() => load(), 220);
    return () => clearTimeout(timer);
  }, [query, roleFilter, load]);

  // Sync rowRoles whenever the members list changes
  useEffect(() => {
    setRowRoles((prev) => {
      const next: Record<string, Role> = {};
      for (const m of rows.members) {
        next[m.userId] = prev[m.userId] ?? m.role;
      }
      return next;
    });
  }, [rows.members]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const pendingInvites = useMemo(
    () => (rows.invites ?? []).filter((i) => i.status === "pending"),
    [rows.invites],
  );

  // ── Invite submit ─────────────────────────────────────────────────────────
  async function handleSendInvite() {
    if (!email.trim()) return;
    setInviteStatus("loading");
    setInviteError("");
    const target = email.trim();
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: target, role: inviteRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error ?? `HTTP ${res.status}`);
      }
      setInvitedEmail(target);
      setInviteStatus("success");
      setEmail("");
      setInviteRole("Viewer");
      load();
      setTimeout(() => setInviteStatus("idle"), 3000);
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invite.");
      setInviteStatus("error");
    }
  }

  // ── Role change ───────────────────────────────────────────────────────────
  function requestRoleChange(member: Member, newRole: Role) {
    setPendingChange({ member, newRole });
    modalState.open();
  }

  async function confirmRoleChange() {
    if (!pendingChange) return;
    setChangeLoading(true);
    try {
      await fetch("/api/workspace/collaborators", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: pendingChange.member.userId,
          role: pendingChange.newRole,
        }),
      });
      load();
    } finally {
      setChangeLoading(false);
      // Clear pendingChange before closing so onOpenChange doesn't reset the row role
      setPendingChange(null);
      modalState.close();
    }
  }

  function cancelRoleChange() {
    // Closing the modal triggers onOpenChange which resets rowRoles and pendingChange
    modalState.close();
  }

  // ── Cancel invite ─────────────────────────────────────────────────────────
  async function handleCancelInvite(token: string) {
    setCancellingTokens((prev) => new Set(prev).add(token));
    try {
      await fetch(`/api/invites/${token}/cancel`, { method: "POST" });
      load();
    } finally {
      setCancellingTokens((prev) => {
        const next = new Set(prev);
        next.delete(token);
        return next;
      });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SettingsShell>
      <div className="flex flex-col gap-6 max-w-4xl">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Team &amp; Collaboration</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage members, roles, and invitations for this workspace.
            </p>
          </div>
          <Chip
            color="default"
            variant="soft"
            size="sm"
            className="ml-auto shrink-0 flex items-center gap-1"
          >
            <Users size={13} className="inline-block" />
            {" "}{rows.members.length} member{rows.members.length !== 1 ? "s" : ""}
          </Chip>
        </div>

        {/* ── Invite Member ─────────────────────────────────────────────────── */}
        <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
          <Card.Content className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus size={16} className="text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-700">Invite a team member</h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Email input — HeroUI v3 Input wraps a native <input> */}
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Mail size={15} />
                </span>
                <input
                  aria-label="Invite collaborator email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleSendInvite()}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <RoleSelect
                label="Invite role"
                value={inviteRole}
                onChange={setInviteRole}
                className="w-40 shrink-0"
              />

              <Button
                variant="primary"
                isDisabled={inviteStatus === "loading"}
                onPress={() => void handleSendInvite()}
                className="shrink-0 flex items-center gap-1.5"
              >
                {inviteStatus === "loading" ? (
                  <Spinner size="sm" />
                ) : (
                  <UserPlus size={15} />
                )}
                Send invite
              </Button>
            </div>

            {inviteStatus === "success" && (
              <p className="text-sm text-green-600">
                Invite sent to <span className="font-medium">{invitedEmail}</span> successfully.
              </p>
            )}
            {inviteStatus === "error" && (
              <p className="text-sm text-red-500">{inviteError}</p>
            )}
          </Card.Content>
        </Card>

        {/* ── Search + Filter ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <input
              aria-label="Search members"
              type="text"
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            )}
          </div>

          {/* Role filter */}
          <SelectRoot<{ id: string; label: string }>
            aria-label="Filter by role"
            selectedKey={roleFilter}
            onSelectionChange={(key) => {
              if (key) setRoleFilter(key as string);
            }}
            className="w-44 shrink-0"
          >
            <SelectTrigger className="flex items-center gap-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none hover:border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100">
              <SelectValue className="flex-1 text-left" />
              <SelectIndicator className="text-slate-400 shrink-0" />
            </SelectTrigger>
            <SelectPopover>
              <ListBox
                className="rounded-lg border border-slate-200 bg-white shadow-lg py-1 outline-none"
                aria-label="Filter by role"
              >
                {(["all", "Owner", ...ROLES] as string[]).map((r) => (
                  <ListBoxItem
                    key={r}
                    id={r}
                    textValue={r === "all" ? "All Roles" : r}
                    className="px-3 py-1.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 outline-none data-[focused]:bg-indigo-50 data-[focused]:text-indigo-700 data-[selected]:font-medium data-[selected]:text-indigo-700"
                  >
                    {r === "all" ? "All Roles" : r}
                  </ListBoxItem>
                ))}
              </ListBox>
            </SelectPopover>
          </SelectRoot>
        </div>

        {/* ── Active Members ────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            Active Members
          </h2>

          {rows.members.length === 0 ? (
            <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
              <Card.Content className="py-10 flex flex-col items-center text-center gap-2">
                <Users size={32} className="text-slate-300" />
                <p className="text-sm font-medium text-slate-500">No members yet</p>
                <p className="text-xs text-slate-400">Invite teammates to collaborate on systems.</p>
              </Card.Content>
            </Card>
          ) : (
            <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
              <Card.Content className="p-0 overflow-hidden">
                <Table className="w-full">
                  <Table.Content>
                    <TableHeader className="bg-slate-50">
                      <TableColumn className="text-xs font-semibold text-slate-500 px-4 py-2.5">
                        MEMBER
                      </TableColumn>
                      <TableColumn className="text-xs font-semibold text-slate-500 px-4 py-2.5">
                        ROLE
                      </TableColumn>
                      <TableColumn className="text-xs font-semibold text-slate-500 px-4 py-2.5 w-72">
                        CHANGE ROLE
                      </TableColumn>
                    </TableHeader>
                    <TableBody>
                      {rows.members.map((m) => {
                        const isOwner        = m.role === "Owner";
                        const displayName    = m.name ?? m.email ?? m.userId;
                        const currentRowRole = rowRoles[m.userId] ?? m.role;

                        return (
                          <TableRow key={m.userId} className="border-t border-slate-100">
                            {/* Member info */}
                            <TableCell className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  size="sm"
                                  className="shrink-0"
                                >
                                  <Avatar.Fallback>
                                    {getInitials(m)}
                                  </Avatar.Fallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">
                                    {displayName}
                                  </p>
                                  {m.email && m.name && (
                                    <p className="text-xs text-slate-400 truncate">{m.email}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Current role chip */}
                            <TableCell className="px-4 py-3">
                              <Chip
                                color={ROLE_CHIP_COLOR[m.role] ?? "default"}
                                variant="soft"
                                size="sm"
                              >
                                {m.role}
                              </Chip>
                            </TableCell>

                            {/* Role select + confirm button */}
                            <TableCell className="px-4 py-3">
                              {isOwner ? (
                                <span className="text-xs text-slate-400 italic">
                                  Owner role is fixed
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <RoleSelect
                                    label={`Change role for ${displayName}`}
                                    value={currentRowRole}
                                    onChange={(val) =>
                                      setRowRoles((prev) => ({ ...prev, [m.userId]: val }))
                                    }
                                    className="w-36"
                                  />
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    isDisabled={currentRowRole === m.role}
                                    onPress={() => requestRoleChange(m, currentRowRole)}
                                  >
                                    Change role
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table.Content>
                </Table>
              </Card.Content>
            </Card>
          )}
        </section>

        {/* ── Pending Invites ───────────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Mail size={16} className="text-slate-400" />
            Pending Invites
            {pendingInvites.length > 0 && (
              <Chip color="warning" variant="soft" size="sm">
                {pendingInvites.length}
              </Chip>
            )}
          </h2>

          {pendingInvites.length === 0 ? (
            <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
              <Card.Content className="py-10 flex flex-col items-center text-center gap-2">
                <Mail size={32} className="text-slate-300" />
                <p className="text-sm font-medium text-slate-500">No pending invites</p>
                <p className="text-xs text-slate-400">New invites will appear here.</p>
              </Card.Content>
            </Card>
          ) : (
            <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
              <Card.Content className="p-0 overflow-hidden">
                <Table className="w-full">
                  <Table.Content>
                    <TableHeader className="bg-slate-50">
                      <TableColumn className="text-xs font-semibold text-slate-500 px-4 py-2.5">
                        EMAIL
                      </TableColumn>
                      <TableColumn className="text-xs font-semibold text-slate-500 px-4 py-2.5">
                        ROLE
                      </TableColumn>
                      <TableColumn className="text-xs font-semibold text-slate-500 px-4 py-2.5">
                        EXPIRES
                      </TableColumn>
                      <TableColumn className="text-xs font-semibold text-slate-500 px-4 py-2.5 w-28">
                        ACTION
                      </TableColumn>
                    </TableHeader>
                    <TableBody>
                      {pendingInvites.map((inv) => (
                        <TableRow key={inv.token} className="border-t border-slate-100">
                          <TableCell className="px-4 py-3">
                            <span className="text-sm text-slate-700">{inv.email}</span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <Chip
                              color={ROLE_CHIP_COLOR[inv.role] ?? "default"}
                              variant="soft"
                              size="sm"
                            >
                              {inv.role}
                            </Chip>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <span className="text-xs text-slate-500">
                              {formatExpiry(inv.expiresAt)}
                            </span>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <Button
                              size="sm"
                              variant="danger-soft"
                              isDisabled={cancellingTokens.has(inv.token)}
                              onPress={() => void handleCancelInvite(inv.token)}
                              className="flex items-center gap-1"
                            >
                              {cancellingTokens.has(inv.token) && <Spinner size="sm" />}
                              Cancel
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table.Content>
                </Table>
              </Card.Content>
            </Card>
          )}
        </section>
      </div>

      {/* ── Role-change confirmation modal ────────────────────────────────── */}
      <ModalRoot state={modalState}>
        <ModalBackdrop isDismissable />
        <ModalContainer size="sm" placement="center">
          <ModalDialog>
            <ModalHeader className="text-base font-semibold text-slate-900">
              Confirm role change
            </ModalHeader>

            <ModalBody>
              {pendingChange && (
                <p className="text-sm text-slate-700">
                  Are you sure you want to change{" "}
                  <span className="font-medium">
                    {pendingChange.member.name ??
                      pendingChange.member.email ??
                      pendingChange.member.userId}
                  </span>
                  &apos;s role to{" "}
                  <Chip
                    color={ROLE_CHIP_COLOR[pendingChange.newRole] ?? "default"}
                    variant="soft"
                    size="sm"
                  >
                    {pendingChange.newRole}
                  </Chip>
                  ?
                </p>
              )}
            </ModalBody>

            <ModalFooter className="flex justify-end gap-2">
              <Button variant="secondary" onPress={cancelRoleChange}>
                Cancel
              </Button>
              <Button
                variant="primary"
                isDisabled={changeLoading}
                onPress={() => void confirmRoleChange()}
                className="flex items-center gap-1.5"
              >
                {changeLoading && <Spinner size="sm" />}
                Confirm
              </Button>
            </ModalFooter>
          </ModalDialog>
        </ModalContainer>
      </ModalRoot>
    </SettingsShell>
  );
}
