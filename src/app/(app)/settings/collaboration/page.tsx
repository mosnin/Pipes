"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Select, Table, EmptyState } from "@/components/ui";
import { SettingsShell } from "@/components/settings/SettingsShell";

const roles = ["Viewer", "Commenter", "Editor", "Admin"];

export default function CollaborationSettingsPage() {
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

  const pendingInvites = useMemo(() => (rows.invites ?? []).filter((i: any) => i.status === "pending"), [rows.invites]);

  return (
    <SettingsShell title="Collaboration" subtitle="Manage members, roles, and invites with explicit safety boundaries.">
      <Card>
        <div className="nav-inline">
          <Input aria-label="Invite collaborator email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
          <Select aria-label="Invite role" value={role} onChange={(e) => setRole(e.target.value)}>{roles.map((r) => <option key={r}>{r}</option>)}</Select>
          <Button onClick={async () => { await fetch("/api/workspace/collaborators", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, role }) }); setEmail(""); load(); }}>Send invite</Button>
        </div>
      </Card>

      <Card>
        <div className="nav-inline">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search members or invites" />
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All roles</option>
            <option>Owner</option>
            {roles.map((r) => <option key={r}>{r}</option>)}
          </Select>
          <Button onClick={load}>Refresh</Button>
        </div>
      </Card>

      <Card>
        <h4>Members</h4>
        {rows.members.length === 0 ? <EmptyState title="No members yet" description="Invite teammates to collaborate on systems." /> : <Table headers={["User", "Role", "Action"]} rows={rows.members.map((m: any) => [m.userId, m.role, m.role === "Owner" ? "Owner is fixed" : "Update role"])} />}
        <div style={{ display: "grid", gap: 8 }}>
          {(rows.members ?? []).filter((m: any) => m.role !== "Owner").map((m: any) => (
            <div className="nav-inline" key={m.userId}>
              <span>{m.userId}</span>
              <Select defaultValue={m.role} onChange={async (e) => {
                const confirmText = prompt(`Type CHANGE ROLE to set ${m.userId} to ${e.target.value}`);
                if (confirmText !== "CHANGE ROLE") return;
                await fetch("/api/workspace/collaborators", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: m.userId, role: e.target.value }) });
                load();
              }}>
                {roles.map((r) => <option key={r}>{r}</option>)}
              </Select>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h4>Invites</h4>
        {rows.invites.length === 0 ? <EmptyState title="No invites" description="New invites will appear here." /> : <Table headers={["Email", "Role", "Status", "Expires"]} rows={rows.invites.map((i: any) => [i.email, i.role, i.status, i.expiresAt])} />}
        <div style={{ display: "grid", gap: 8 }}>{pendingInvites.map((i: any) => <Button key={i.token} onClick={async () => { await fetch(`/api/invites/${i.token}/cancel`, { method: "POST" }); load(); }}>Cancel {i.email}</Button>)}</div>
      </Card>
    </SettingsShell>
  );
}
