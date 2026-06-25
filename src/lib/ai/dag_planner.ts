import { z } from "zod";
import { env, runtimeFlags, DEFAULT_OPENROUTER_MODEL } from "@/lib/env";
import { AiSystemDraftSchema } from "@/lib/ai";

// ---------------------------------------------------------------------------
// DAG Planner — agents build workflows autonomously given a goal
// ---------------------------------------------------------------------------
// Unlike the document compiler (static doc → graph), the DAG planner starts
// from a high-level goal and reasons about what steps, agents, tools, and
// parallel branches are needed to accomplish it. The result is a DAG where
// independent nodes can execute in parallel.
//
// "DAG" here means: the graph has no cycles (unlike Loop nodes), nodes at the
// same topological depth have no inter-dependencies and can run in parallel,
// and edges represent data passing between steps.

export const DagPlanRequestSchema = z.object({
  goal: z.string().min(5).max(2000),
  context: z.string().max(2000).optional(),
  parallelism: z.enum(["sequential", "parallel", "auto"]).default("auto"),
});

export type DagPlanRequest = z.infer<typeof DagPlanRequestSchema>;

// The planned execution order — which nodes run in parallel at each level
export const DagExecutionPlanSchema = z.object({
  levels: z.array(
    z.object({
      level: z.number(),
      nodeIds: z.array(z.string()),
      description: z.string(),
    })
  ),
});

export type DagExecutionPlan = z.infer<typeof DagExecutionPlanSchema>;

// Extended graph with DAG metadata
export const AgentDagSchema = AiSystemDraftSchema.extend({
  executionPlan: DagExecutionPlanSchema,
  goal: z.string(),
  estimatedTokens: z.number().optional(),
  parallelizable: z.boolean(),
});

export type AgentDag = z.infer<typeof AgentDagSchema>;

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const DAG_SYSTEM_PROMPT = `You are an autonomous agent DAG planner. Given a high-level goal, you plan a complete Directed Acyclic Graph (DAG) of agent tasks to accomplish it — WITHOUT human intervention in the graph construction.

KEY PRINCIPLE: Design for maximum parallelism. Independent tasks should run simultaneously. Only serialize when there is a true data dependency.

Mapping rules:
- Decompose the goal into atomic agent tasks (2-5 nodes per logical phase)
- Independent tasks with no data dependency → same topological level (parallel)
- Tasks that need another's output → next level (sequential)
- Use Agent nodes for AI reasoning tasks
- Use Tool/ExternalApi for external calls (can often parallelize across APIs)
- Use Action for deterministic computation
- Use Guardrail after any user-provided input or external data
- Use Evaluator when quality/correctness must be checked before proceeding
- Use HumanApproval ONLY when genuinely required (legal, financial, irreversible)
- Use Memory/Datastore when state must persist across the DAG
- Use Router when results need fan-out to multiple parallel paths
- Use Checkpoint at phase boundaries (enables resume on failure)
- Add Monitor node if the goal involves long-running or batch processing

Layout rules for DAG visualization:
- Nodes at the same level: same x position, staggered y (y: 60, 200, 340, ...)
- Each level increments x by 200
- Level 0 (inputs/triggers) at x: 80
- Final output at rightmost x

CRITICAL: In executionPlan.levels, each level lists the nodeIds that can execute IN PARALLEL at that step. Think carefully about true data dependencies — if task B only needs the goal (available from the start), it can be at level 0 alongside task A.

Return ONLY strict JSON:
{
  "systemName": string,
  "description": string,
  "goal": string,
  "parallelizable": boolean,
  "nodes": [{"id": string, "type": string, "title": string, "description": string, "x": number, "y": number}],
  "pipes": [{"fromNodeId": string, "toNodeId": string}],
  "assumptions": string[],
  "warnings": string[],
  "executionPlan": {
    "levels": [{"level": number, "nodeIds": string[], "description": string}]
  },
  "estimatedTokens": number
}`;

// ---------------------------------------------------------------------------
// Mock response
// ---------------------------------------------------------------------------

const MOCK_DAG: AgentDag = {
  systemName: "Content Marketing Pipeline",
  description: "Agent-planned DAG: Research, write, edit, and distribute content in parallel where possible.",
  goal: "Create and distribute a complete content marketing piece",
  parallelizable: true,
  estimatedTokens: 12000,
  nodes: [
    { id: "n_start", type: "Input", title: "Campaign Brief", description: "Topic, audience, tone, keywords", x: 80, y: 200 },
    { id: "n_research_web", type: "Agent", title: "Web Research", description: "Scrape top 10 sources for the topic", x: 280, y: 60 },
    { id: "n_research_kw", type: "Tool", title: "Keyword Analysis", description: "Pull search volume and competition data", x: 280, y: 200 },
    { id: "n_research_comp", type: "Agent", title: "Competitor Analysis", description: "Analyze top-ranking content structure", x: 280, y: 340 },
    { id: "n_outline", type: "Agent", title: "Outline Generator", description: "Synthesizes research into SEO-optimized outline", x: 480, y: 200 },
    { id: "n_checkpoint1", type: "Checkpoint", title: "Research Complete", description: "Save research artifacts before drafting", x: 480, y: 340 },
    { id: "n_draft", type: "Agent", title: "Draft Writer", description: "Writes full draft from outline and research", x: 680, y: 200 },
    { id: "n_edit", type: "Evaluator", title: "Quality Evaluator", description: "Scores draft on clarity, SEO, tone, accuracy", x: 880, y: 200 },
    { id: "n_approve", type: "HumanApproval", title: "Editorial Review", description: "Human editor approves before distribution", x: 880, y: 340 },
    { id: "n_router", type: "Router", title: "Distribution Router", description: "Fans out to all channels in parallel", x: 1080, y: 200 },
    { id: "n_blog", type: "Action", title: "Publish to Blog", description: "Format as HTML and push to CMS", x: 1280, y: 80 },
    { id: "n_social", type: "Agent", title: "Social Snippets", description: "Generate Twitter/LinkedIn variations", x: 1280, y: 200 },
    { id: "n_email", type: "Agent", title: "Email Newsletter", description: "Adapt as newsletter segment", x: 1280, y: 340 },
    { id: "n_monitor", type: "Monitor", title: "Performance Monitor", description: "Track views, shares, conversions post-publish", x: 1480, y: 200 },
  ],
  pipes: [
    { fromNodeId: "n_start", toNodeId: "n_research_web" },
    { fromNodeId: "n_start", toNodeId: "n_research_kw" },
    { fromNodeId: "n_start", toNodeId: "n_research_comp" },
    { fromNodeId: "n_research_web", toNodeId: "n_outline" },
    { fromNodeId: "n_research_kw", toNodeId: "n_outline" },
    { fromNodeId: "n_research_comp", toNodeId: "n_outline" },
    { fromNodeId: "n_outline", toNodeId: "n_checkpoint1" },
    { fromNodeId: "n_checkpoint1", toNodeId: "n_draft" },
    { fromNodeId: "n_draft", toNodeId: "n_edit" },
    { fromNodeId: "n_edit", toNodeId: "n_approve" },
    { fromNodeId: "n_approve", toNodeId: "n_router" },
    { fromNodeId: "n_router", toNodeId: "n_blog" },
    { fromNodeId: "n_router", toNodeId: "n_social" },
    { fromNodeId: "n_router", toNodeId: "n_email" },
    { fromNodeId: "n_blog", toNodeId: "n_monitor" },
    { fromNodeId: "n_social", toNodeId: "n_monitor" },
    { fromNodeId: "n_email", toNodeId: "n_monitor" },
  ],
  assumptions: ["Assumes access to a web search tool and CMS API.", "Keyword tool is SEMrush or Ahrefs compatible."],
  warnings: ["Human approval step will serialize the pipeline. Remove if speed > control."],
  executionPlan: {
    levels: [
      { level: 0, nodeIds: ["n_start"], description: "Initialize with campaign brief" },
      { level: 1, nodeIds: ["n_research_web", "n_research_kw", "n_research_comp"], description: "Parallel research across 3 sources" },
      { level: 2, nodeIds: ["n_outline", "n_checkpoint1"], description: "Synthesize research into outline, save checkpoint" },
      { level: 3, nodeIds: ["n_draft"], description: "Write full draft from outline" },
      { level: 4, nodeIds: ["n_edit", "n_approve"], description: "Evaluate quality and editorial approval" },
      { level: 5, nodeIds: ["n_router"], description: "Fan out to distribution channels" },
      { level: 6, nodeIds: ["n_blog", "n_social", "n_email"], description: "Parallel distribution across all channels" },
      { level: 7, nodeIds: ["n_monitor"], description: "Monitor performance" },
    ],
  },
};

// ---------------------------------------------------------------------------
// Planner implementations
// ---------------------------------------------------------------------------

export interface DagPlanner {
  plan(req: DagPlanRequest): Promise<AgentDag>;
}

class MockDagPlanner implements DagPlanner {
  async plan(_req: DagPlanRequest): Promise<AgentDag> {
    return MOCK_DAG;
  }
}

class OpenAiDagPlanner implements DagPlanner {
  private model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  async plan(req: DagPlanRequest): Promise<AgentDag> {
    const userMsg = `GOAL: ${req.goal}${req.context ? `\n\nCONTEXT: ${req.context}` : ""}\n\nPARALLELISM PREFERENCE: ${req.parallelism}`;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: [
          { role: "system", content: DAG_SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
    });
    const body = await res.json();
    const text = body?.choices?.[0]?.message?.content ?? "{}";
    const raw = JSON.parse(text.replace(/```json\n?|```/g, "").trim());
    return AgentDagSchema.parse(raw);
  }
}

class OpenRouterDagPlanner implements DagPlanner {
  private model = env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL;

  async plan(req: DagPlanRequest): Promise<AgentDag> {
    const userMsg = `GOAL: ${req.goal}${req.context ? `\n\nCONTEXT: ${req.context}` : ""}\n\nPARALLELISM PREFERENCE: ${req.parallelism}`;
    const res = await fetch(`${env.OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "content-type": "application/json",
        "X-Title": "Looper DAG Planner",
        "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: DAG_SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
    });
    if (!res.ok) throw new Error(`openrouter_${res.status}`);
    const body = await res.json();
    const text = body?.choices?.[0]?.message?.content ?? "{}";
    const raw = JSON.parse(text);
    return AgentDagSchema.parse(raw);
  }
}

export function getDagPlanner(): DagPlanner {
  if (runtimeFlags.hasOpenRouter) return new OpenRouterDagPlanner();
  if (!runtimeFlags.useMocks && runtimeFlags.hasOpenAI) return new OpenAiDagPlanner();
  return new MockDagPlanner();
}
