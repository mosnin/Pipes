import json
import os
import requests

BASE_URL = os.getenv("PIPES_BASE_URL", "http://localhost:3000")
TOKEN = os.getenv("PIPES_AGENT_TOKEN", "")


def call(path: str, method: str = "GET", payload=None, idem_key: str | None = None):
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
    }
    if idem_key:
        headers["Idempotency-Key"] = idem_key
    resp = requests.request(method, f"{BASE_URL}{path}", headers=headers, data=json.dumps(payload) if payload else None, timeout=30)
    return resp.json()


if __name__ == "__main__":
    print("systems", call("/api/protocol/systems"))
    created = call("/api/protocol/systems", method="POST", payload={"name": "Python SDK System", "description": "created from python example"}, idem_key="python-create-1")
    print("create", created)
    system_id = created.get("data", {}).get("systemId")
    if system_id:
        print("schema", call(f"/api/protocol/systems/{system_id}/schema"))
        print("template", call("/api/protocol/templates/single-agent-loop/instantiate", method="POST", payload={"name": "Py Template"}, idem_key="python-template-1"))
        print("graph", call("/api/protocol/graph", method="POST", payload={"action": "addNode", "systemId": system_id, "type": "Agent", "title": "Py Node", "x": 140, "y": 140}))
