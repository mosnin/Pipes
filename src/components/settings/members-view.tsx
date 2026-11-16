"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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

const roles = ["Viewer", "Commenter", "Editor", "Admin"];
const roleOptions = roles.map((r) => ({ value: r, label: r }));

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
}

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

  const labelFor = (userId: string) => (userId === me.userId ? "You" : userId);

  const changeRole = async (userId: string, next: string) => {
    const confirmText = prompt(`Type CHANGE ROLE to set ${labelFor(userId)} to ${next}`);
    if (confirmText !== "CHANGE ROLE") return;
    const res = await fetch("/api/workspace/collaborators", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, role: next }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!data?.ok) toast(apiErrorMessage(data, "The role did not change."));
    load();
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
                <Select id={`${fieldId}-role`} size="sm" disabled={!canInvite} value={role} onValueChange={setRole} options={roleOptions} />
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
              options={[{ value: "all", label: "All roles" }, { value: "Owner", label: "Owner" }, ...roleOptions]}
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
                leading={<Avatar label={m.userId === me.userId ? me.name : m.userId} kind="human" size={28} />}
                title={m.userId === me.userId ? me.name || "You" : <span className="t-mono-hash">{m.userId}</span>}
                subtitle={
                  [m.userId === me.userId ? `You, ${me.email}` : null, m.role === "Owner" ? "Owner. This role is fixed." : null].filter(Boolean).join(" · ") ||
                  undefined
                }
                trailing={
                  m.role === "Owner" ? (
                    <StatusPill role="neutral">Owner</StatusPill>
                  ) : (
                    <div className="w-[132px]">
                      <Select
                        aria-label={`Role for ${labelFor(m.userId)}`}
                        size="sm"
                        variant="quiet"
                        align="end"
                        value={m.role}
                        onValueChange={(next) => void changeRole(m.userId, next)}
                        options={roleOptions}
                      />
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
    </SettingsShell>
  );
}
