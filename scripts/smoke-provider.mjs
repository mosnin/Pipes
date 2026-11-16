#!/usr/bin/env node
/**
 * End-to-end smoke test of the real (non-mock) runtime against a running
 * server. Creates two accounts and exercises the main user journeys through
 * the HTTP API, printing one line per check.
 *
 *   BASE_URL=http://localhost:3124 node scripts/smoke-provider.mjs
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3124";
const stamp = Date.now().toString(36);
let failures = 0;

function jar() {
  let cookie = "";
  return async (path, { method = "GET", body, raw } = {}) => {
    const res = await fetch(BASE + path, {
      method,
      redirect: "manual",
      headers: { ...(body ? { "content-type": "application/json" } : {}), ...(cookie ? { cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(",").map((c) => c.split(";")[0].trim()).filter((c) => c.includes("=")).join("; ");
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text: raw ? text : undefined };
  };
}

async function check(label, fn) {
  try {
    const detail = await fn();
    console.log(`ok    ${label}${detail ? `  (${detail})` : ""}`);
    return detail;
  } catch (error) {
    failures += 1;
    console.log(`FAIL  ${label}: ${String(error.message ?? error).slice(0, 400)}`);
    return undefined;
  }
}

function expectOk(res, what) {
  if (res.status >= 400 || (res.json && res.json.ok === false)) throw new Error(`${what} -> ${res.status} ${JSON.stringify(res.json).slice(0, 300)}`);
  return res.json?.data ?? res.json;
}

const owner = jar();
const teammate = jar();
const ownerEmail = `owner-${stamp}@example.com`;
const mateEmail = `mate-${stamp}@example.com`;

await check("sign up owner", async () => expectOk(await owner("/api/auth/signup", { method: "POST", body: { name: "Owner Person", email: ownerEmail, password: "correct horse battery" } }), "signup") && "");
await check("duplicate signup rejected", async () => {
  const res = await jar()("/api/auth/signup", { method: "POST", body: { name: "Dup", email: ownerEmail, password: "correct horse battery" } });
  if (res.status !== 409) throw new Error(`expected 409, got ${res.status}`);
});
await check("dashboard loads with session", async () => {
  const res = await owner("/dashboard");
  if (res.status !== 200) throw new Error(`status ${res.status}`);
});

const systemId = await check("create system", async () => expectOk(await owner("/api/systems", { method: "POST", body: { name: "Smoke system", description: "Created by smoke test" } }), "create").systemId);
const workspaceId = await check("get system bundle", async () => {
  const data = expectOk(await owner(`/api/systems/${systemId}`), "bundle");
  return data.system.workspaceId;
});

// Paid-plan paths (versions, collaboration) need a plan. Against a local Convex
// deployment the smoke test upgrades its own workspace directly.
if (process.env.SMOKE_UPGRADE_WITH_CONVEX === "1") {
  await check("upgrade workspace to Builder (local Convex)", async () => {
    const { execFileSync } = await import("node:child_process");
    execFileSync("npx", ["convex", "run", "app:upsertPlanState", JSON.stringify({ workspaceId, plan: "Builder", status: "active" })], { stdio: "pipe", env: { ...process.env, CONVEX_AGENT_MODE: "anonymous" } });
  });
}

const nodeA = await check("add node A", async () => {
  const data = expectOk(await owner("/api/graph", { method: "POST", body: { action: "addNode", systemId, type: "Input", title: "Ticket in", description: "", x: 100, y: 100 } }), "addNode");
  return data.result?.id ?? data.result;
});
const nodeB = await check("add node B", async () => {
  const data = expectOk(await owner("/api/graph", { method: "POST", body: { action: "addNode", systemId, type: "Agent", title: "Triage", description: "", x: 400, y: 100 } }), "addNode");
  return data.result?.id ?? data.result;
});
await check("update node position", async () => expectOk(await owner("/api/graph", { method: "POST", body: { action: "updateNode", nodeId: nodeA, position: { x: 140, y: 160 } } }), "updateNode") && "");
const pipeId = await check("connect A -> B", async () => {
  const data = expectOk(await owner("/api/graph", { method: "POST", body: { action: "addPipe", systemId, fromNodeId: nodeA, toNodeId: nodeB } }), "addPipe");
  return data.result?.id ?? data.result;
});
await check("graph persisted (re-read)", async () => {
  const data = expectOk(await owner(`/api/systems/${systemId}`), "bundle");
  const moved = data.nodes.find((n) => n.id === nodeA);
  if (data.nodes.length !== 2 || data.pipes.length !== 1) throw new Error(`nodes=${data.nodes.length} pipes=${data.pipes.length}`);
  if (moved?.position?.x !== 140) throw new Error(`position not saved: ${JSON.stringify(moved?.position)}`);
});
await check("comment on node", async () => expectOk(await owner("/api/comments", { method: "POST", body: { systemId, body: "Check the refund rules", nodeId: nodeB } }), "comment") && "");
await check("create version", async () => expectOk(await owner(`/api/systems/${systemId}/versions`, { method: "POST", body: { name: "v1" } }), "version") && "");
await check("list versions", async () => {
  const data = expectOk(await owner(`/api/systems/${systemId}/versions`), "versions");
  const list = Array.isArray(data) ? data : data.versions ?? [];
  if (!list.length) throw new Error("no versions");
  return `${list.length} version(s)`;
});
await check("delete pipe", async () => expectOk(await owner("/api/graph", { method: "POST", body: { action: "deletePipe", pipeId } }), "deletePipe") && "");
await check("favorite + tags", async () => {
  expectOk(await owner("/api/library", { method: "POST", body: { action: "favorite", systemId, favorite: true } }), "favorite");
  expectOk(await owner("/api/library", { method: "POST", body: { action: "tags", systemId, tags: ["support"] } }), "tags");
});
await check("library lists system", async () => {
  const data = expectOk(await owner("/api/library?status=active&sort=recent_activity"), "library");
  const row = data.rows.find((r) => r.id === systemId);
  if (!row) throw new Error("system missing from library");
  return `favorite=${row.favorite} tags=${row.tags.join(",")}`;
});
await check("export json", async () => {
  const res = await owner(`/api/systems/${systemId}/export?format=json`);
  if (res.status !== 200) throw new Error(`status ${res.status}`);
});
await check("instantiate template", async () => expectOk(await owner("/api/templates/single-agent-loop/instantiate", { method: "POST", body: {} }), "instantiate").systemId);
await check("onboarding recommend", async () => expectOk(await owner("/api/onboarding", { method: "POST", body: { action: "recommend", role: "builder", useCase: "support" } }), "recommend") && "");
await check("archive + restore", async () => {
  expectOk(await owner(`/api/systems/${systemId}`, { method: "POST", body: { action: "archive" } }), "archive");
  expectOk(await owner(`/api/systems/${systemId}`, { method: "POST", body: { action: "restore" } }), "restore");
});
const token = await check("create API token", async () => {
  const data = expectOk(await owner("/api/settings/tokens", { method: "POST", body: { name: "smoke", capabilities: ["systems:read", "schema:read", "templates:read", "graph:write", "runs:write", "runs:read"] } }), "token");
  return data.token ?? data.secret ?? data.plaintext;
});
await check("REST protocol with token", async () => {
  const res = await fetch(`${BASE}/api/protocol/systems`, { headers: { authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (res.status !== 200) throw new Error(`status ${res.status} ${JSON.stringify(json).slice(0, 200)}`);
  return `${(json.data ?? []).length} systems`;
});
await check("audit log has entries", async () => {
  const data = expectOk(await owner("/api/settings/audit"), "audit");
  const rows = Array.isArray(data) ? data : data.rows ?? data.events ?? [];
  return `${rows.length} events`;
});
await check("feedback", async () => expectOk(await owner("/api/feedback", { method: "POST", body: { category: "bug", severity: "low", summary: "Smoke test feedback", details: "From smoke test", page: "/dashboard" } }), "feedback") && "");
await check("another account cannot read or edit this workspace's system", async () => {
  const outsider = jar();
  expectOk(await outsider("/api/auth/signup", { method: "POST", body: { name: "Outsider", email: `outsider-${stamp}@example.com`, password: "a different passphrase" } }), "outsider signup");
  const read = await outsider(`/api/systems/${systemId}`);
  if (read.status < 400) throw new Error(`read allowed: ${read.status}`);
  const edit = await outsider("/api/graph", { method: "POST", body: { action: "updateNode", nodeId: nodeA, title: "hijacked" } });
  if (edit.status < 400) throw new Error(`edit allowed: ${edit.status}`);
  const exported = await outsider(`/api/systems/${systemId}/export?format=json`);
  if (exported.status < 400) throw new Error(`export allowed: ${exported.status}`);
  const runs = await outsider(`/api/systems/${systemId}/runs`);
  if (runs.status < 400) throw new Error(`runs allowed: ${runs.status}`);
});
const inviteToken = await check("invite teammate", async () => {
  expectOk(await owner("/api/invites", { method: "POST", body: { email: mateEmail, role: "Editor" } }), "invite");
  const data = expectOk(await owner("/api/invites"), "list invites");
  const list = Array.isArray(data) ? data : data.invites ?? [];
  const invite = list.find((i) => i.email === mateEmail);
  if (!invite) throw new Error("invite not listed");
  return invite.token;
});
await check("teammate signs up and accepts", async () => {
  expectOk(await teammate("/api/auth/signup", { method: "POST", body: { name: "Mate Person", email: mateEmail, password: "another good passphrase" } }), "mate signup");
  expectOk(await teammate(`/api/invites/${inviteToken}/accept`, { method: "POST" }), "accept");
});
await check("agent session + run", async () => {
  const session = expectOk(await owner("/api/agent/sessions", { method: "POST", body: { systemId, title: "Smoke session" } }), "session");
  const run = expectOk(await owner("/api/agent/runs", { method: "POST", body: { sessionId: session.id ?? session.sessionId, systemId, message: "Add a guardrail before output" } }), "run");
  return `run ${run.id ?? run.runId ?? "created"}`;
});
await check("log out then dashboard redirects", async () => {
  await owner("/api/auth/logout");
  const res = await owner("/dashboard");
  if (res.status !== 307) throw new Error(`expected redirect, got ${res.status}`);
});
await check("log back in", async () => expectOk(await owner("/api/auth/login", { method: "POST", body: { email: ownerEmail, password: "correct horse battery" } }), "login") && "");

console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
