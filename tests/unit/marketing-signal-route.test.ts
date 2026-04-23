import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/marketing/signal/route";

describe("marketing signal route", () => {
  it("rejects unknown event names", async () => {
    const res = await POST(new Request("http://localhost/api/marketing/signal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "unknown_event" }) }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.data.ok).toBe(false);
  });
});
