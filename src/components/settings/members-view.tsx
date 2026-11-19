"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "@/components/ui/icon";
import { assignableRoles, can, roleChangeProblem } from "@/domain/permissions";
import type { Role } from "@/domain/pipes_schema_v1/schema";
import { Card, CardFooter } from "@/components/ui/card";
import { Field, Input, SearchInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toolbar } from "@/components/ui/page-header";
import { GroupedList, GroupedRow } from "@/components/ui/grouped-list";
import { Avatar } from "@/components/ledger/author-stamp";
import { StatusPill, type SignalRole } from "@/components/ledger/status";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { sentenceCase } from "@/components/settings/fact-list";
import { apiErrorMessage } from "@/components/shell/api-error";
import { PlanNote } from "@/components/shell/plan-note";
import { useBillingStatus } from "@/components/shell/use-billing-status";
import { Banner } from "@/components/ui/banner";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";

const roleOptions = (roles: Role[]) => roles.map((r) => ({ value: r, label: r }));

const INVITE_ROLE: Record<string, SignalRole> = {
  pending: "caution",
  accepted: "positive",
  cancelled: "neutral",
  canceled: "neutral",
  expired: "neutral"
};

/** Who the signed-in person is, so their own row reads "You" rather than an id. */
export interface CurrentMember {
  userId: string;
  name: string;
  email: string;
  role: Role;
}

type Pending = { kind: "role"; userId: string; next: Role } | { kind: "remove"; userId: string } | { kind: "transfer"; userId: string };

export function MembersView({ me }: { me: CurrentMember }) {
  const fieldId = useId();
  const toast = useToast();
  const billing = useBillingStatus();
  const canInvite = billing ? billing.entitlements.collaboration : true;
  const [rows, setRows] = useState<any>({ members: [], invites: [] });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Viewer");
  const [pending, setPending] = useState<Pending | null>(null);
  const assignable = assignableRoles(me.role);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (roleFilter) params.set("role", roleFilter);
    fetch(`/api/workspace/collaborators?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) {
          setRows(d.data ?? { members: [], invites: [] });
          setLoadError(null);
        } else setLoadError(apiErrorMessage(d, "Members could not be loaded."));
      })
      .catch(() => setLoadError("Pipes could not be reached. Check your connection and try again."));
  }, [query, roleFilter]);

  useEffect(() => { load(); // initial load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => { load(); }, 220);
    return () => clearTimeout(timer);
  }, [query, roleFilter, load]);

  const pendingInvites = useMemo(() => new Set((rows.invites ?? []).filter((i: any) => i.status === "pending").map((i: any) => i.token)), [rows.invites]);

  const sendInvite = async () => {
    setSending(true);
    setInviteError(null);
    const res = await fetch("/api/workspace/collaborators", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, role }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setSending(false);
    if (!data?.ok) {
      setInviteError(apiErrorMessage(data, "The invite could not be sent."));
      return;
    }
    toast(`Invite sent to ${email}`);
    setEmail("");
    load();
  };

  const labelFor = (userId: string) => {
    if (userId === me.userId) return "You";
    const m = (rows.members ?? []).find((x: { userId: string }) => x.userId === userId);
    return m?.name || m?.email || "this member";
  };

  /** Runs the confirmed change. Every refusal comes back with the server's own reason. */
  const commit = async (p: Pending) => {
    const req =
      p.kind === "remove"
        ? fetch(`/api/workspace/collaborators?userId=${encodeURIComponent(p.userId)}`, { method: "DELETE" })
        : fetch("/api/workspace/collaborators", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(p.kind === "role" ? { userId: p.userId, role: p.next } : { userId: p.userId, action: "transfer_ownership" }) });
    const data = await req.then((r) => r.json()).catch(() => null);
    if (!data?.ok) toast(apiErrorMessage(data, "Nothing changed."), { tone: "error" });
    else toast(p.kind === "remove" ? "Removed. They lose access on their next request." : p.kind === "transfer" ? "Ownership transferred. You are now an Admin." : "Role changed.");
    setPending(null);
    if (p.kind === "transfer") window.location.reload();
    else load();
  };

  const members: any[] = rows.members ?? [];
  const invites: any[] = rows.invites ?? [];

  return (
    <SettingsShell
      title="Members"
      measure="prose"
      description="Everyone who can open this workspace's workflows, and the role each one holds. Role changes ask for confirmation."
      meta={<span className="t-caption tabular text-ink-3">{members.length} {members.length === 1 ? "person" : "people"}</span>}
    >
      {loadError ? (
        <Banner role="critical" title="Members could not be loaded">
          {loadError}
        </Banner>
      ) : null}

      <SettingsSection title="Invite someone">
        {!canInvite ? (
          <PlanNote title="Inviting people is on the Pro plan" className="mb-3">
            {billing ? `This workspace is on the ${billing.plan} plan, which doesn't include collaboration.` : null}
          </PlanNote>
        ) : null}
        <Card>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendInvite();
            }}
          >
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_180px]">
              <Field label="Email" htmlFor={`${fieldId}-email`}>
                <Input id={`${fieldId}-email`} type="email" required disabled={!canInvite} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
              </Field>
              <Field label="Role" htmlFor={`${fieldId}-role`}>
                <Select id={`${fieldId}-role`} size="sm" disabled={!canInvite} value={role} onValueChange={setRole} options={roleOptions(assignable)} />
              </Field>
            </div>
            {inviteError ? (
              <div role="alert" className="px-4 pb-4">
                <Banner role="critical" title="The invite wasn't sent">
                  {inviteError}
                </Banner>
              </div>
            ) : null}
            <CardFooter inset>
              <span className="t-caption text-ink-3">They join with the role you pick. You can change it later.</span>
              <Button type="submit" variant="primary" size="sm" disabled={!canInvite || !email.trim()} loading={sending}>
                Send invite
              </Button>
            </CardFooter>
          </form>
        </Card>
      </SettingsSection>

      <div className="flex flex-col gap-6">
        <Toolbar>
          <SearchInput
            aria-label="Search members or invites"
            placeholder="Search members or invites"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            className="min-w-[200px] flex-1"
          />
          <div className="w-[160px]">
            <Select
              aria-label="Filter by role"
              size="sm"
              value={roleFilter}
              onValueChange={setRoleFilter}
              options={[{ value: "all", label: "All roles" }, ...roleOptions(["Owner", "Admin", "Editor", "Commenter", "Viewer"])]}
            />
          </div>
          <Button variant="secondary" size="sm" onClick={load}>
            Refresh
          </Button>
        </Toolbar>

        <SettingsSection title="People">
          <GroupedList empty="No members match. Invite teammates to work on workflows together.">
            {members.map((m) => (
              <GroupedRow
                key={m.userId}
                leading={<Avatar label={m.userId === me.userId ? me.name : m.name || m.email || "Member"} kind="human" size={28} />}
                title={m.userId === me.userId ? me.name || "You" : m.name || m.email || <span className="t-mono-hash">{m.userId}</span>}
                subtitle={(m.userId === me.userId ? `You, ${me.email}` : m.email) || undefined}
                trailing={
                  roleChangeProblem({ actor: me.role, actorId: me.userId, targetId: m.userId, target: m.role }) !== null ? (
                    <StatusPill role="neutral">{m.role}</StatusPill>
                  ) : (
                    <div className="flex items-center gap-1">
                      <div className="w-[116px]">
                        <Select
                          aria-label={`Role for ${labelFor(m.userId)}`}
                          size="sm"
                          variant="quiet"
                          align="end"
                          value={m.role}
                          onValueChange={(next) => setPending({ kind: "role", userId: m.userId, next: next as Role })}
                          options={roleOptions(assignable.includes(m.role) ? assignable : [m.role, ...assignable])}
                        />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label={`More for ${labelFor(m.userId)}`} className="px-2">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {can(me.role, "ownership.transfer") ? <DropdownMenuItem onSelect={() => setPending({ kind: "transfer", userId: m.userId })}>Make Owner</DropdownMenuItem> : null}
                          <DropdownMenuItem onSelect={() => setPending({ kind: "remove", userId: m.userId })}>Remove from workspace</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                }
              />
            ))}
          </GroupedList>
        </SettingsSection>

        <SettingsSection title="Invites">
          <GroupedList empty="No invites. New invites appear here until they are accepted or cancelled.">
            {invites.map((i) => (
              <GroupedRow
                key={i.token}
                title={i.email}
                subtitle={`${i.role} · expires ${i.expiresAt ? formatDate(i.expiresAt) : "never"}`}
                trailing={
                  <>
                    <StatusPill role={INVITE_ROLE[i.status] ?? "neutral"}>{sentenceCase(i.status)}</StatusPill>
                    {pendingInvites.has(i.token) ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        aria-label={`Cancel invite for ${i.email}`}
                        onClick={async () => { await fetch(`/api/invites/${i.token}/cancel`, { method: "POST" }); load(); }}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </>
                }
              />
            ))}
          </GroupedList>
        </SettingsSection>
      </div>
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => (open ? undefined : setPending(null))}
        title={pending?.kind === "remove" ? `Remove ${pending ? labelFor(pending.userId) : ""} from the workspace?` : pending?.kind === "transfer" ? "Hand this workspace to someone else?" : `Make ${pending ? labelFor(pending.userId) : ""} ${pending?.kind === "role" ? pending.next : ""}?`}
        description={
          pending?.kind === "remove"
            ? "They lose access on their next request, and API tokens they created stop working. Their work stays."
            : pending?.kind === "transfer"
              ? "They become the Owner, with billing and the power to manage Admins. You become an Admin, and only the new Owner can undo this."
              : "Their access changes on their next request. The change is recorded in the audit log."
        }
        confirmLabel={pending?.kind === "remove" ? "Remove" : pending?.kind === "transfer" ? "Transfer ownership" : "Change role"}
        destructive={pending?.kind !== "role"}
        confirmPhrase={pending?.kind === "transfer" ? "TRANSFER" : pending?.kind === "remove" ? "REMOVE" : undefined}
        onConfirm={() => (pending ? commit(pending) : undefined)}
      />
    </SettingsShell>
  );
}
