const baseUrl = process.env.PIPES_BASE_URL ?? "http://localhost:3000";
const token = process.env.PIPES_AGENT_TOKEN ?? "";

async function call(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
      ...(init.headers ?? {})
    }
  });
  return response.json();
}

async function main() {
  console.log("systems", await call("/api/protocol/systems"));
  const created = await call("/api/protocol/systems", {
    method: "POST",
    headers: { "idempotency-key": "example-create-system-1" },
    body: JSON.stringify({ name: "SDK Created System", description: "created by TS example" })
  });
  console.log("create", created);

  const systemId = created?.data?.systemId;
  if (!systemId) return;

  console.log("schema", await call(`/api/protocol/systems/${systemId}/schema`));
  console.log("template", await call("/api/protocol/templates/multi-agent-handoff/instantiate", {
    method: "POST",
    headers: { "idempotency-key": "example-template-1" },
    body: JSON.stringify({ name: "Template from SDK" })
  }));
  console.log("graph", await call("/api/protocol/graph", {
    method: "POST",
    body: JSON.stringify({ action: "addNode", systemId, type: "Agent", title: "SDK Node", x: 120, y: 180 })
  }));
}

main().catch(console.error);
