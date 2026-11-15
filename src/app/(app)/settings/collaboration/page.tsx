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

export default function CollaborationSettingsPage() {
  const fieldId = useId();
  const [rows, setRows] = useState<any>({ members: [], invites: [] });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Viewer");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (roleFilter) params.set("role", roleFilter);
    fetch(`/api/workspace/collaborators?${params.toString()}`).then((r) => r.json()).then((d) => setRows(d.data ?? { members: [], invites: [] }));
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
    await fetch("/api/workspace/collaborators", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, role }) });
    setEmail("");
    load();
  };

  const changeRole = async (userId: string, next: string) => {
    const confirmText = prompt(`Type CHANGE ROLE to set ${userId} to ${next}`);
    if (confirmText !== "CHANGE ROLE") return;
    await fetch("/api/workspace/collaborators", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, role: next }) });
    load();
  };

  const members: any[] = rows.members ?? [];
  const invites: any[] = rows.invites ?? [];

  return (
    <SettingsShell
      title="Members"
      measure="prose"
      description="Everyone who can open this workspace's systems, and the role each one holds. Role changes ask for confirmation."
      meta={<span className="t-caption tabular text-ink-3">{members.length} {members.length === 1 ? "person" : "people"}</span>}
    >
      <SettingsSection title="Invite someone">
        <Card>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendInvite();
            }}
          >
            <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-[minmax(0,1fr)_180px]">
              <Field label="Email" htmlFor={`${fieldId}-email`}>
                <Input id={`${fieldId}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
              </Field>
              <Field label="Role" htmlFor={`${fieldId}-role`}>
                <Select id={`${fieldId}-role`} size="sm" value={role} onValueChange={setRole} options={roleOptions} />
              </Field>
            </div>
            <CardFooter inset>
              <span className="t-caption text-ink-3">They join with the role you pick. You can change it later.</span>
              <Button type="submit" variant="primary" size="sm">
                Send invite
              </Button>
            </CardFooter>
          </form>
        </Card>
      </SettingsSection>

      <div className="flex flex-col gap-8">
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
          <GroupedList empty="No members match. Invite teammates to work on systems together.">
            {members.map((m) => (
              <GroupedRow
                key={m.userId}
                leading={<Avatar label={m.userId} kind="human" size={28} />}
                title={<span className="t-mono-hash">{m.userId}</span>}
                subtitle={m.role === "Owner" ? "Owner. This role is fixed." : undefined}
                trailing={
                  m.role === "Owner" ? (
                    <StatusPill role="neutral">Owner</StatusPill>
                  ) : (
                    <div className="w-[132px]">
                      <Select
                        aria-label={`Role for ${m.userId}`}
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
