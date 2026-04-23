"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Panel } from "@/components/ui";

type Session = { id: string; title: string; systemId?: string; createdAt: string };
type Run = { id: string; status: string };
type Event = { id: string; type: string; text?: string; status?: string; sequence: number; at: string; graphActionProposal?: { id?: string; actionType?: string; rationale?: string; status?: string } };
type Proposal = { id: string; actionType: string; rationale: string; status: string; riskClass: string; applyMode: string; validationStatus: string; payload: Record<string, unknown> };

export function AgentChatPanel({ systemId, systemName, systemDescription }: { systemId: string; systemName: string; systemDescription?: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [events, setEvents] = useState<Event[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [prompt, setPrompt] = useState("Suggest one safe reliability improvement and call out risky changes for review.");
  const [runStatus, setRunStatus] = useState("idle");
  const [activeRunId, setActiveRunId] = useState<string | undefined>();

  const assistantText = useMemo(() => events.filter((event) => event.type === "assistant_text_delta" || event.type === "assistant_text_completed").map((event) => event.text ?? "").join(""), [events]);

  const refreshSessions = useCallback(async () => {
    const res = await fetch(`/api/agent/sessions?systemId=${systemId}`, { cache: "no-store" });
    const body = await res.json();
    if (!body.ok) return;
    setSessions(body.data);
    if (!sessionId && body.data[0]) setSessionId(body.data[0].id);
  }, [sessionId, systemId]);

  const refreshProposals = async (runId?: string) => {
    if (!runId) return;
    const res = await fetch(`/api/agent/proposals?runId=${runId}`, { cache: "no-store" });
    const body = await res.json();
    if (body.ok) setProposals(body.data);
  };

  useEffect(() => { void refreshSessions(); }, [refreshSessions]);

  const ensureSession = async () => {
    if (sessionId) return sessionId;
    const create = await fetch("/api/agent/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemId, title: `${systemName} Builder Session` }) });
    const body = await create.json();
    if (!body.ok) throw new Error(body.error ?? "session_create_failed");
    setSessionId(body.data.id);
    await refreshSessions();
    return body.data.id as string;
  };

  const runPrompt = async () => {
    const sid = await ensureSession();
    setRunStatus("running");
    setEvents([]);
    setProposals([]);
    const createRun = await fetch("/api/agent/runs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: sid, systemId, message: prompt }) });
    const runBody = await createRun.json();
    if (!runBody.ok) return setRunStatus("failed");
    const run = runBody.data as { run: Run };
    setActiveRunId(run.run.id);

    const streamRes = await fetch(`/api/agent/runs/${run.run.id}/stream`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: prompt, systemName, systemDescription }) });
    if (!streamRes.body) return setRunStatus("failed");

    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";
      for (const chunk of chunks) {
        if (!chunk.startsWith("data:")) continue;
        const payload = JSON.parse(chunk.slice(5).trim()) as Event;
        setEvents((prev) => [...prev, payload]);
        if (payload.status) setRunStatus(payload.status);
      }
      await refreshProposals(run.run.id);
    }
    await refreshProposals(run.run.id);
    setRunStatus((prev) => (prev === "running" ? "completed" : prev));
  };

  const review = async (proposalId: string, decision: "approve" | "reject") => {
    await fetch(`/api/agent/proposals/${proposalId}/${decision}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
    await refreshProposals(activeRunId);
  };

  return (
    <Panel title="Builder Agent">
      <p className="badge">System attached: {systemName}</p>
      <p className="badge">Run status: {runStatus}</p>
      <div className="nav-inline" style={{ flexWrap: "wrap" }}>
        {sessions.map((session) => <Button key={session.id} onClick={() => setSessionId(session.id)}>{session.id === sessionId ? `• ${session.title}` : session.title}</Button>)}
        <Button onClick={async () => { setSessionId(undefined); await ensureSession(); }}>New Session</Button>
      </div>
      <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask the builder agent" />
      <Button onClick={runPrompt} disabled={runStatus === "running"}>Run</Button>
      <Card><h4>Assistant stream</h4><p>{assistantText || "No output yet."}</p></Card>
      <Card>
        <h4>Action timeline</h4>
        <div className="validation-list">
          {proposals.map((proposal) => (
            <div key={proposal.id} style={{ marginBottom: 10 }}>
              <p><strong>{proposal.actionType}</strong> · {proposal.status} · {proposal.riskClass}</p>
              <p>{proposal.rationale}</p>
              {proposal.status === "pending_review" && (
                <div className="nav-inline">
                  <Button onClick={() => review(proposal.id, "approve")}>Approve</Button>
                  <Button onClick={() => review(proposal.id, "reject")}>Reject</Button>
                </div>
              )}
            </div>
          ))}
          {proposals.length === 0 && <p>No actions yet.</p>}
        </div>
      </Card>
      <Card>
        <h4>Run events</h4>
        <div className="validation-list">
          {events.slice(-12).map((event) => <p key={event.id}>{event.sequence}. {event.type}{event.text ? ` · ${event.text.slice(0, 80)}` : ""}</p>)}
        </div>
      </Card>
    </Panel>
  );
}
