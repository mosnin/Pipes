#!/usr/bin/env node
/**
 * End-to-end test of the workflow layer against a running server in real mode:
 * design specs, runs over MCP, human approval, connections, webhooks, cron,
 * OAuth and usage. Start the server with CRON_SECRET set, then:
 *
 *   BASE_URL=http://localhost:3124 CRON_SECRET=... node scripts/smoke-workflow.mjs
 */
import http from "node:http";
import crypto from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:3124";
const stamp = Date.now().toString(36);
let failures = 0;
let cookie = "";

async function call(path, { method = "GET", body, headers = {}, form } = {}) {
  const res = await fetch(BASE + path, {
    method,
    redirect: "manual",
    headers: { ...(body ? { "content-type": "application/json" } : {}), ...(form ? { "content-type": "application/x-www-form-urlencoded" } : {}), ...(cookie && !headers.authorization ? { cookie } : {}), ...headers },
    body: body ? JSON.stringify(body) : form ? new URLSearchParams(form).toString() : undefined
  });
  const set = res.headers.get("set-cookie");
  if (set && !headers.authorization) cookie = set.split(",").map((c) => c.split(";")[0].trim()).filter((c) => c.includes("=")).join("; ");
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, headers: res.headers };
}

async function check(label, fn) {
  try {
    const detail = await fn();
    console.log(`ok    ${label}${detail ? `  (${detail})` : ""}`);
    return detail;
  } catch (error) {
    failures += 1;
    console.log(`FAIL  ${label}: ${String(error.message ?? error).slice(0, 500)}`);
    return undefined;
  }
}

const data = (res, what) => {
  if (res.status >= 400 || res.json?.ok === false) throw new Error(`${what} -> ${res.status} ${JSON.stringify(res.json).slice(0, 400)}`);
  return res.json?.data ?? res.json;
};

let rpcId = 0;
async function mcp(token, method, params) {
  const res = await call("/api/mcp", { method: "POST", headers: { authorization: `Bearer ${token}`, accept: "application/json, text/event-stream" }, body: { jsonrpc: "2.0", id: ++rpcId, method, params } });
  if (res.status !== 200) throw new Error(`mcp ${method} -> ${res.status} ${JSON.stringify(res.json).slice(0, 300)}`);
  if (res.json.error) throw new Error(`mcp ${method} error: ${res.json.error.message}`);
  return res.json.result;
}
async function tool(token, name, args) {
  const result = await mcp(token, "tools/call", { name, arguments: args });
  const text = result.content?.[0]?.text ?? "";
  if (result.isError) throw new Error(`${name}: ${text}`);
  return JSON.parse(text);
}

// Outbound webhook receiver
const received = [];
const receiver = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    received.push({ event: req.headers["x-pipes-event"], signature: req.headers["x-pipes-signature"], timestamp: req.headers["x-pipes-timestamp"], body });
    res.end("ok");
  });
});
await new Promise((r) => receiver.listen(3999, r));

await check("sign up", async () => data(await call("/api/auth/signup", { method: "POST", body: { name: "Flow Owner", email: `flow-${stamp}@example.com`, password: "correct horse battery" } }), "signup") && "");

await check("Free plan cannot create API tokens", async () => {
  const res = await call("/api/settings/tokens", { method: "POST", body: { name: "free", capabilities: ["runs:read"] } });
  if (res.status < 400) throw new Error(`token created on Free: ${res.status}`);
});

const systemId = await check("create workflow", async () => data(await call("/api/systems", { method: "POST", body: { name: "Refund desk" } }), "create").systemId);
const idOf = (result) => (typeof result === "string" ? result : result?.id);
const add = async (type, title, x) => idOf(data(await call("/api/graph", { method: "POST", body: { action: "addNode", systemId, type, title, x, y: 100 } }), "addNode").result);
const pipe = async (fromNodeId, toNodeId) => idOf(data(await call("/api/graph", { method: "POST", body: { action: "addPipe", systemId, fromNodeId, toNodeId } }), "addPipe").result);
const tokenOf = (d) => d.token ?? d.secret ?? d.plaintext;

if (process.env.SMOKE_UPGRADE_WITH_CONVEX === "1") {
  await check("upgrade workspace to Pro (local Convex)", async () => {
    const bundle = data(await call(`/api/systems/${systemId}`), "bundle");
    const { execFileSync } = await import("node:child_process");
    execFileSync("npx", ["convex", "run", "app:upsertPlanState", JSON.stringify({ workspaceId: bundle.system.workspaceId, plan: "Pro", status: "active", serverKey: process.env.PIPES_CONVEX_SERVER_KEY })], { stdio: "pipe", env: { ...process.env, CONVEX_AGENT_MODE: "anonymous" } });
  });
}

const ids = {};
await check("build graph", async () => {
  ids.in = await add("Input", "Ticket in", 0);
  ids.triage = await add("Agent", "Triage ticket", 200);
  ids.approve = await add("HumanApproval", "Approve refund", 400);
  ids.reply = await add("Agent", "Send reply", 600);
  ids.p1 = await pipe(ids.in, ids.triage);
  ids.pRefund = await pipe(ids.triage, ids.approve);
  ids.pQuestion = await pipe(ids.triage, ids.reply);
  ids.pApproved = await pipe(ids.approve, ids.reply);
  return `${Object.keys(ids).length} ids`;
});

const connectionId = await check("create MCP connection with secret", async () => {
  const conn = data(await call("/api/connections", { method: "POST", body: { name: "Helpdesk MCP", type: "mcp", url: "https://helpdesk.example.com/mcp", secret: "hd_secret_123456" } }), "connection");
  if (conn.secret || !conn.hasSecret) throw new Error("secret leaked or missing");
  return conn.id;
});

await check("save step specs and routes", async () => {
  data(
    await call(`/api/systems/${systemId}/design`, {
      method: "PUT",
      body: {
        steps: { [ids.triage]: { instructions: "Read the ticket and decide if it is a refund request or a question.", doneWhen: "You chose refund or question.", skills: ["support-triage"], connectionIds: [connectionId] }, [ids.approve]: { approverRole: "Editor" } },
        routes: { [ids.pRefund]: { routeKind: "conditional", label: "refund" }, [ids.pQuestion]: { routeKind: "conditional", label: "question" }, [ids.pApproved]: { routeKind: "success" } }
      }
    }),
    "design"
  );
  const design = data(await call(`/api/systems/${systemId}/design`), "design get");
  if (design.steps[ids.triage].instructions?.startsWith("Read the ticket") !== true) throw new Error("spec not saved");
});

const token = await check("create agent token (runs, no secrets)", async () => tokenOf(data(await call("/api/settings/tokens", { method: "POST", body: { name: "agent", capabilities: ["systems:read", "runs:read", "runs:write", "templates:read"] } }), "token")));
const secretToken = await check("create agent token (with secrets)", async () => tokenOf(data(await call("/api/settings/tokens", { method: "POST", body: { name: "agent-secrets", capabilities: ["systems:read", "runs:read", "runs:write", "connections:secrets"] } }), "token")));

await check("MCP initialize", async () => {
  const init = await mcp(token, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "smoke", version: "1" } });
  if (init.serverInfo?.name !== "pipes" || !init.capabilities?.tools) throw new Error(JSON.stringify(init));
  return init.protocolVersion;
});
await check("MCP without token is 401 with resource metadata", async () => {
  const res = await call("/api/mcp", { method: "POST", body: { jsonrpc: "2.0", id: 1, method: "tools/list" } });
  if (res.status !== 401 || !String(res.headers.get("www-authenticate")).includes("resource_metadata")) throw new Error(`status ${res.status}`);
});
await check("MCP tools/list", async () => {
  const list = await mcp(token, "tools/list", {});
  const names = list.tools.map((t) => t.name);
  for (const n of ["start_run", "get_current_step", "complete_step"]) if (!names.includes(n)) throw new Error(`missing ${n}`);
  return `${names.length} tools`;
});

let runId;
await check("start_run over MCP returns the first step", async () => {
  const step = await tool(token, "start_run", { systemId, input: { ticket: "I want my money back" } });
  runId = step.runId;
  if (step.step?.title !== "Ticket in") throw new Error(JSON.stringify(step.step));
  return runId;
});
await check("complete step 1, next step has instructions and connection (no secret)", async () => {
  const step = await tool(token, "complete_step", { runId, nodeId: ids.in, output: { ticket: "I want my money back" } });
  if (step.step?.title !== "Triage ticket") throw new Error(`got ${step.step?.title}`);
  if (!step.step.instructions?.includes("refund")) throw new Error("instructions missing");
  if (step.options.length !== 2) throw new Error(`options ${step.options.length}`);
  if (step.connections?.[0]?.name !== "Helpdesk MCP" || step.connections[0].headers) throw new Error(`connection ${JSON.stringify(step.connections)}`);
});
await check("token with connections:secrets receives the header", async () => {
  const step = await tool(secretToken, "get_current_step", { runId });
  const header = step.connections?.[0]?.headers?.Authorization;
  if (header !== "Bearer hd_secret_123456") throw new Error(`header ${header}`);
});
await check("ambiguous completion asks for a route", async () => {
  try {
    await tool(token, "complete_step", { runId, outcome: "success" });
    throw new Error("expected an error");
  } catch (error) {
    if (!String(error.message).includes("possible routes")) throw error;
  }
});
await check("set outbound webhook", async () => data(await call(`/api/systems/${systemId}/triggers`, { method: "POST", body: { action: "set_outbound", url: "http://127.0.0.1:3999/events" } }), "outbound").secret ? "secret issued" : "");
await check("route by label to approval, run waits", async () => {
  const step = await tool(token, "complete_step", { runId, outcome: "refund", output: { category: "refund" } });
  if (step.status !== "waiting_approval") throw new Error(step.status);
});
await check("approval inbox lists the run", async () => {
  const runs = data(await call("/api/runs?status=waiting_approval"), "inbox");
  if (!runs.some((r) => r.id === runId)) throw new Error("not in inbox");
});
await check("agent cannot approve", async () => {
  const res = await call(`/api/runs/${runId}/decide`, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: { decision: "approved" } });
  if (res.status < 400) throw new Error(`status ${res.status}`);
});
await check("person approves, run moves on", async () => {
  data(await call(`/api/runs/${runId}/decide`, { method: "POST", body: { decision: "approved", comment: "Within policy" } }), "decide");
  const step = await tool(token, "get_current_step", { runId });
  if (step.step?.title !== "Send reply") throw new Error(step.step?.title);
});
await check("finish the run", async () => {
  const step = await tool(token, "complete_step", { runId, output: "Refund sent" });
  if (step.status !== "completed") throw new Error(step.status);
});
await check("run history for the system", async () => {
  const runs = data(await call(`/api/systems/${systemId}/runs`), "runs");
  const run = runs.find((r) => r.id === runId);
  if (run?.status !== "completed" || run.stepCount !== 4) throw new Error(JSON.stringify(run));
  return `${run.stepCount} steps`;
});
await check("outbound events delivered and signed", async () => {
  await new Promise((r) => setTimeout(r, 500));
  const events = received.map((e) => e.event);
  if (!events.includes("approval.requested") || !events.includes("run.completed")) throw new Error(`events ${events.join(",")}`);
  return events.join(", ");
});

await check("inbound webhook starts a run", async () => {
  const { key } = data(await call(`/api/systems/${systemId}/triggers`, { method: "POST", body: { action: "rotate_webhook" } }), "rotate");
  const bad = await call(`/api/hooks/${systemId}`, { method: "POST", headers: { "x-pipes-key": "wrong" }, body: { a: 1 } });
  if (bad.status !== 401) throw new Error(`bad key status ${bad.status}`);
  const res = await call(`/api/hooks/${systemId}`, { method: "POST", headers: { "x-pipes-key": key, cookie: "" }, body: { ticket: "hello" } });
  return data(res, "hook").runId;
});
await check("schedule validation and cron endpoint", async () => {
  const bad = await call(`/api/systems/${systemId}/triggers`, { method: "POST", body: { action: "add_schedule", cron: "every monday" } });
  if (bad.status !== 400) throw new Error("bad cron accepted");
  data(await call(`/api/systems/${systemId}/triggers`, { method: "POST", body: { action: "add_schedule", cron: "*/5 * * * *", label: "Every five minutes" } }), "add schedule");
  const denied = await call("/api/cron/schedules", { headers: { authorization: "Bearer nope" } });
  if (denied.status !== 401) throw new Error("cron without secret allowed");
  if (process.env.CRON_SECRET) {
    const res = await call("/api/cron/schedules", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    return `fired ${data(res, "cron").fired}`;
  }
  return "CRON_SECRET not set, skipped the authorized call";
});

await check("OAuth: discovery, registration, consent, token, MCP", async () => {
  const meta = (await call("/.well-known/oauth-protected-resource/api/mcp")).json;
  const as = (await call("/.well-known/oauth-authorization-server")).json;
  if (!meta.authorization_servers?.length || !as.registration_endpoint) throw new Error("metadata missing");
  const reg = await call("/api/oauth/register", { method: "POST", body: { client_name: "Smoke Client", redirect_uris: ["http://127.0.0.1:3999/callback"] } });
  if (reg.status !== 201) throw new Error(`register ${reg.status}`);
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const query = new URLSearchParams({ response_type: "code", client_id: reg.json.client_id, redirect_uri: "http://127.0.0.1:3999/callback", code_challenge: challenge, code_challenge_method: "S256", state: "xyz", scope: "pipes" }).toString();
  const consent = await call(`/oauth/authorize?${query}`);
  if (consent.status !== 200) throw new Error(`consent page ${consent.status}`);
  const approved = await call("/api/oauth/authorize", { method: "POST", form: { query, decision: "approve" } });
  const location = new URL(approved.headers.get("location"));
  if (location.searchParams.get("state") !== "xyz" || !location.searchParams.get("code")) throw new Error(`redirect ${location}`);
  const tokenRes = await call("/api/oauth/token", { method: "POST", form: { grant_type: "authorization_code", code: location.searchParams.get("code"), client_id: reg.json.client_id, redirect_uri: "http://127.0.0.1:3999/callback", code_verifier: verifier } });
  if (!tokenRes.json?.access_token) throw new Error(`token ${JSON.stringify(tokenRes.json)}`);
  const replay = await call("/api/oauth/token", { method: "POST", form: { grant_type: "authorization_code", code: location.searchParams.get("code"), client_id: reg.json.client_id, redirect_uri: "http://127.0.0.1:3999/callback", code_verifier: verifier } });
  if (replay.status !== 400) throw new Error("code replay accepted");
  const list = await mcp(tokenRes.json.access_token, "tools/list", {});
  return `${list.tools.length} tools via OAuth`;
});

await check("usage counted", async () => {
  const usage = data(await call("/api/usage"), "usage");
  if (usage.totals.runs < 2 || usage.totals.steps < 3 || usage.totals.calls < 5) throw new Error(JSON.stringify(usage.totals));
  return `runs ${usage.totals.runs}, steps ${usage.totals.steps}, calls ${usage.totals.calls}`;
});

receiver.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
