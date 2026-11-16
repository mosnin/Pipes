import { starterTemplates } from "@/domain/templates/catalog";

/** The home hero and closing CTA. The rest of the home page lives in its route. */
export const homeSections = {
  hero: {
    title: "The workflows your agents follow, kept in one place.",
    lead: "Draw each workflow as steps, approvals, loops and branches. Agents run it over MCP one step at a time, people sign off where it matters, and every run stays on the record.",
    primaryCta: { label: "Start free workspace", href: "/signup?source=home_hero" },
    secondaryCta: { label: "Explore templates", href: "/templates" }
  },
  finalCta: { label: "Start free workspace", href: "/signup?source=home_final" }
};

export const useCases = [
  {
    slug: "support-triage",
    title: "Support triage with a refund approval",
    problem: "An agent can read and sort tickets all day. Nobody wants it sending refunds before a person has looked.",
    fit: "The workflow classifies the ticket, checks it against policy and stops at a human approval before any refund goes out. The run waits in the Approvals inbox until someone approves it, rejects it or sends it back.",
    workflow: [
      "Your help desk calls the workflow's webhook, and the ticket becomes the run's input",
      "The agent classifies the ticket and drafts a reply",
      "A policy check spells out what the agent may do without asking",
      "Refunds stop at a human approval that only an Admin or Owner can decide",
      "The run records who decided, when, and what was sent"
    ],
    templateIds: ["support-ops-system"]
  },
  {
    slug: "code-change-review",
    title: "Code change with a review loop",
    problem: "Coding agents write changes faster than anyone can review them, and the steps between the change and the merge live in a prompt that shifts every week.",
    fit: "Write the steps down once: plan, change, test, review. A loop sends the change back for another pass until the review passes or the iteration limit is hit, and a person signs off before anything merges.",
    workflow: [
      "Start from the single agent loop and add steps for the tests and the review",
      "Give each step instructions and a done-when line the agent can check",
      "Put the review in a loop step with an iteration limit",
      "Add a human approval before the merge",
      "Point your coding agent at the workflow over MCP"
    ],
    templateIds: ["single-agent-loop"]
  },
  {
    slug: "research-human-check",
    title: "Research with a human check",
    problem: "A research agent can write a confident brief from weak sources. Someone should read it before it reaches a customer or a decision.",
    fit: "The planner, the retriever and the synthesizer are steps in one workflow, with a human approval between the draft and the final brief. What each step produced stays in the run history.",
    workflow: [
      "Start from the multi-agent research template",
      "Attach the search tools the retriever uses as connections",
      "Add a human approval after the synthesizer",
      "Send the draft back with a comment when it needs another pass",
      "Read the finished run to see what each step found"
    ],
    templateIds: ["multi-agent-research"]
  },
  {
    slug: "scheduled-operations",
    title: "Scheduled and event-driven jobs",
    problem: "The weekly report and the nightly data check run from a cron line somewhere, and nobody can say what they did last Tuesday.",
    fit: "A schedule or an inbound webhook starts the run. Each run keeps its input, every step's output and the version it followed, and signed outbound events tell your other tools when it finishes or fails.",
    workflow: [
      "Start from the automation workflow template",
      "Add a cron schedule, or turn on the workflow's webhook",
      "Describe the decision and the action as steps an agent can carry out",
      "Send run events to your own endpoint, signed so you can verify them",
      "Check run history when someone asks what happened"
    ],
    templateIds: ["automation-workflow"]
  },
  {
    slug: "agent-handoffs",
    title: "Handoffs between agents",
    problem: "When a planner hands work to a specialist and the specialist hands it to a reviewer, the rules for each handoff end up spread across three prompts.",
    fit: "One workflow holds every step and the routes between them. Each step says what it needs, how to tell it is done and which skills and connections to load, so whichever agent picks up the run knows its part.",
    workflow: [
      "Lay out the roles as steps, with the routes between them",
      "Write instructions and a done-when line for each step",
      "Give each step only the skills and connections it needs",
      "Issue each agent a token scoped to the workflow",
      "Follow the run as it moves from one agent to the next"
    ],
    templateIds: ["multi-agent-research", "single-agent-loop"]
  }
] as const;

export const comparisons = [
  {
    slug: "docs-and-prompts",
    title: "Pipes vs procedures in docs and prompts",
    summary: "Most teams start by writing the procedure into a doc or a system prompt. That works until it has approvals, loops or more than one agent.",
    differences: [
      "Each step is its own record, with instructions, a done-when line, skills and connections, instead of a paragraph the agent has to interpret.",
      "The run is tracked. Pipes knows which step the agent is on, what each step produced and where the run goes next.",
      "A human approval pauses the run until a person decides. The agent does not have to remember to stop and ask.",
      "Loops have an iteration limit that Pipes enforces, not the agent.",
      "Versions are saved, and each run records the version it followed."
    ],
    otherFit: "A doc or a prompt is the better choice for a short procedure one agent follows with no sign-off. Walking a run step by step over MCP is overhead that three lines of instructions do not need.",
    bestFor: "When a procedure has more than a few steps, stops for a person, or is followed by more than one agent."
  },
  {
    slug: "automation-tools",
    title: "Pipes vs n8n and Zapier",
    summary: "Automation tools run each step themselves by calling the apps you connect. Pipes keeps the procedure, and an agent does each step and reports back.",
    differences: [
      "Pipes does not call your apps. It hands the current step to an agent, with instructions and the connections to use, and records what the agent reports.",
      "Steps are written in plain language, for work that needs judgment rather than a fixed field mapping.",
      "Runs are walked over MCP, so any MCP client can follow a workflow: Claude, ChatGPT, Cursor or an agent you built.",
      "Approvals, loop limits, versions and run history come with every workflow."
    ],
    otherFit: "When every step is a fixed action, like copying a form submission into a spreadsheet, an automation tool does it with less setup and no agent involved. The two also work together: an automation can start a Pipes run through its webhook.",
    bestFor: "When the steps need an agent's judgment, and you still want the procedure written down, signed off where it matters and on the record."
  }
] as const;

export const templateMarketing = starterTemplates.map((template) => ({
  id: template.id,
  slug: template.id,
  title: template.title,
  description: template.description,
  category: template.category,
  useCase: template.useCase,
  complexity: template.complexity,
  preview: `${template.nodes.length} steps · ${template.pipes.length} connections`,
  keywords: [template.category.toLowerCase(), template.useCase.toLowerCase(), template.complexity]
}));
