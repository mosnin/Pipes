import { describe, expect, it } from "vitest";
import { runHeuristicBuild } from "@/lib/ai/heuristic_build";
import type { AgentLoopEvent } from "@/lib/ai/openrouter";

async function collect(prompt: string): Promise<AgentLoopEvent[]> {
  const out: AgentLoopEvent[] = [];
  for await (const ev of runHeuristicBuild({ systemId: "sys_1", prompt })) out.push(ev);
  return out;
}

function nodeTitles(events: AgentLoopEvent[]): string[] {
  return events
    .filter((e): e is Extract<AgentLoopEvent, { kind: "tool_result" }> => e.kind === "tool_result" && e.action?.action === "addNode")
    .map((e) => (e.action as { title: string }).title);
}

describe("runHeuristicBuild", () => {
  it("always produces a complete loop with an entry and exit", async () => {
    const titles = nodeTitles(await collect("do something"));
    expect(titles[0]).toBe("Inbound");
    expect(titles.at(-1)).toBe("Result");
    expect(titles.length).toBeGreaterThanOrEqual(3);
  });

  it("tailors the graph to the prompt's domain signals", async () => {
    const support = nodeTitles(await collect("triage support tickets, look up the knowledge base, and escalate to a human"));
    expect(support).toContain("Classifier");
    expect(support).toContain("Retriever");
    expect(support).toContain("Human Review");

    const research = nodeTitles(await collect("research a topic, synthesize findings, and evaluate confidence"));
    expect(research).toContain("Synthesizer");
    expect(research).toContain("Evaluator");

    // Different prompts produce different graphs (not a canned fixture).
    expect(support.join()).not.toBe(research.join());
  });

  it("wires a back-edge when the prompt asks to iterate", async () => {
    const events = await collect("draft content and refine it in a loop until it passes");
    const addNodes = events.filter((e): e is Extract<AgentLoopEvent, { kind: "tool_result" }> => e.kind === "tool_result" && e.action?.action === "addNode");
    const addPipes = events.filter((e): e is Extract<AgentLoopEvent, { kind: "tool_result" }> => e.kind === "tool_result" && e.action?.action === "addPipe");
    expect(addNodes.map((e) => (e.action as { type: string }).type)).toContain("LoopControl");
    // A loop has at least as many pipes as the linear chain plus the back-edge.
    expect(addPipes.length).toBeGreaterThanOrEqual(addNodes.length);
  });

  it("emits a paired, terminating event stream", async () => {
    const events = await collect("classify and respond");
    const calls = events.filter((e) => e.kind === "tool_call").length;
    const results = events.filter((e) => e.kind === "tool_result").length;
    expect(calls).toBe(results);
    expect(events.some((e) => e.kind === "message")).toBe(true);
  });
});
