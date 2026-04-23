export type StarterTemplate = {
  id: string;
  title: string;
  description: string;
  category: string;
  useCase: string;
  complexity: "simple" | "standard" | "advanced";
  nodes: Array<{ id: string; type: string; title: string; x: number; y: number }>;
  pipes: Array<{ fromNodeId: string; toNodeId: string }>;
};

export const starterTemplates: StarterTemplate[] = [
  {
    id: "single-agent-loop",
    title: "Single Agent Loop",
    description: "Input→agent→output baseline loop.",
    category: "Core",
    useCase: "Assistant baseline",
    complexity: "simple",
    nodes: [
      { id: "input", type: "Input", title: "User Input", x: 120, y: 120 },
      { id: "agent", type: "Agent", title: "Reasoning Agent", x: 360, y: 120 },
      { id: "output", type: "Output", title: "Response", x: 620, y: 120 }
    ],
    pipes: [{ fromNodeId: "input", toNodeId: "agent" }, { fromNodeId: "agent", toNodeId: "output" }]
  },
  {
    id: "multi-agent-research",
    title: "Multi-agent Research",
    description: "Planner + researcher + synthesizer flow.",
    category: "Research",
    useCase: "RAG research orchestration",
    complexity: "advanced",
    nodes: [
      { id: "in", type: "Input", title: "Research Question", x: 100, y: 160 },
      { id: "plan", type: "Agent", title: "Planner", x: 320, y: 100 },
      { id: "research", type: "Tool", title: "Retriever", x: 320, y: 230 },
      { id: "synth", type: "Agent", title: "Synthesizer", x: 580, y: 160 },
      { id: "out", type: "Output", title: "Research Brief", x: 820, y: 160 }
    ],
    pipes: [{ fromNodeId: "in", toNodeId: "plan" }, { fromNodeId: "plan", toNodeId: "research" }, { fromNodeId: "research", toNodeId: "synth" }, { fromNodeId: "synth", toNodeId: "out" }]
  },
  {
    id: "automation-workflow",
    title: "Automation Workflow",
    description: "Trigger→decision→action automation.",
    category: "Automation",
    useCase: "Ops automation",
    complexity: "standard",
    nodes: [
      { id: "trigger", type: "Trigger", title: "Event Trigger", x: 100, y: 160 },
      { id: "decision", type: "Decision", title: "Rule Decision", x: 350, y: 160 },
      { id: "action", type: "Action", title: "Execute Action", x: 620, y: 160 },
      { id: "output", type: "Output", title: "Execution Report", x: 860, y: 160 }
    ],
    pipes: [{ fromNodeId: "trigger", toNodeId: "decision" }, { fromNodeId: "decision", toNodeId: "action" }, { fromNodeId: "action", toNodeId: "output" }]
  },
  {
    id: "support-ops-system",
    title: "Support Ops System",
    description: "Classify, guardrail, and escalate support flows.",
    category: "Operations",
    useCase: "Support triage",
    complexity: "standard",
    nodes: [
      { id: "input", type: "Input", title: "Ticket Intake", x: 100, y: 160 },
      { id: "classifier", type: "Agent", title: "Classifier", x: 320, y: 160 },
      { id: "guardrail", type: "Guardrail", title: "Policy Check", x: 560, y: 160 },
      { id: "approval", type: "HumanApproval", title: "Escalation Review", x: 780, y: 160 },
      { id: "out", type: "Output", title: "Final Resolution", x: 1020, y: 160 }
    ],
    pipes: [{ fromNodeId: "input", toNodeId: "classifier" }, { fromNodeId: "classifier", toNodeId: "guardrail" }, { fromNodeId: "guardrail", toNodeId: "approval" }, { fromNodeId: "approval", toNodeId: "out" }]
  }
];
