import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import { RunEventSchema, type RunEvent, type RunStatus } from "@/domain/agent_builder/model";
import { getAgentStreamingProvider } from "@/lib/ai/agent_stream";

const now = () => new Date().toISOString();

export interface RunExecutor {
  execute(input: { systemName?: string; systemDescription?: string; message: string; onTextDelta: (delta: string) => Promise<void> }): Promise<void>;
}

export class InlineRunExecutor implements RunExecutor {
  async execute(input: { systemName?: string; systemDescription?: string; message: string; onTextDelta: (delta: string) => Promise<void> }) {
    const provider = getAgentStreamingProvider();
    for await (const delta of provider.streamBuilderResponse({ systemName: input.systemName, systemDescription: input.systemDescription, message: input.message })) {
      await input.onTextDelta(delta);
    }
  }
}

export class ModalReadyRunExecutor implements RunExecutor {
  constructor(private readonly inline: RunExecutor = new InlineRunExecutor()) {}
  async execute(input: { systemName?: string; systemDescription?: string; message: string; onTextDelta: (delta: string) => Promise<void> }) {
    return this.inline.execute(input);
  }
}

export class AgentRunService {
  constructor(private readonly repos: RepositorySet, private readonly executor: RunExecutor = new ModalReadyRunExecutor()) {}

  async createSession(ctx: AppContext, input: { systemId?: string; title?: string }) {
    const session = await this.repos.agentBuilder.createSession({ workspaceId: ctx.workspaceId, systemId: input.systemId, title: input.title ?? "System Builder Session", createdBy: ctx.userId });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as never, action: "agent_session_created", targetType: "agent_session", targetId: session.id, outcome: "success" });
    return session;
  }

  async listSessions(ctx: AppContext, systemId?: string) {
    return this.repos.agentBuilder.listSessions({ workspaceId: ctx.workspaceId, systemId });
  }

  async createRun(ctx: AppContext, input: { sessionId: string; systemId?: string; message: string }) {
    const userMessage = await this.repos.agentBuilder.addMessage({ sessionId: input.sessionId, workspaceId: ctx.workspaceId, systemId: input.systemId, role: "user", body: input.message });
    const run = await this.repos.agentBuilder.createRun({ sessionId: input.sessionId, workspaceId: ctx.workspaceId, systemId: input.systemId, userMessageId: userMessage.id });
    await this.appendEvent({ sessionId: input.sessionId, runId: run.id, workspaceId: ctx.workspaceId, systemId: input.systemId, type: "run_created", at: now(), sequence: 1, status: "created" });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as never, action: "agent_chat_message_sent", targetType: "agent_run", targetId: run.id, outcome: "success" });
    return { run, userMessage };
  }

  async streamRun(ctx: AppContext, input: { runId: string; message: string; systemName?: string; systemDescription?: string; onEvent?: (event: RunEvent) => Promise<void> }) {
    const run = await this.repos.agentBuilder.getRun(input.runId);
    if (!run) throw new Error("run_not_found");

    let seq = (await this.repos.agentBuilder.listRunEvents({ runId: run.id })).length;
    const publish = async (event: Omit<RunEvent, "id" | "sequence">) => {
      const stored = await this.appendEvent({ ...event, sequence: ++seq });
      if (input.onEvent) await input.onEvent(stored);
      return stored;
    };

    await this.repos.agentBuilder.updateRun({ runId: run.id, status: "running", startedAt: now() });
    await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "run_started", at: now(), status: "running" });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_run_started", targetType: "agent_run", targetId: run.id, outcome: "success" });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_stream_opened", targetType: "agent_run", targetId: run.id, outcome: "success" });

    let fullText = "";
    try {
      await this.executor.execute({
        systemName: input.systemName,
        systemDescription: input.systemDescription,
        message: input.message,
        onTextDelta: async (delta) => {
          fullText += delta;
          await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "assistant_text_delta", at: now(), text: delta });
        }
      });
      await this.repos.agentBuilder.addMessage({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, role: "assistant", body: fullText });
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "assistant_text_completed", at: now(), text: fullText });
      await this.repos.agentBuilder.updateRun({ runId: run.id, status: "completed", endedAt: now() });
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "run_completed", at: now(), status: "completed" });
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_run_completed", targetType: "agent_run", targetId: run.id, outcome: "success" });
    } catch (error) {
      const message = (error as Error).message;
      await this.repos.agentBuilder.updateRun({ runId: run.id, status: "failed", endedAt: now(), error: message });
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "run_failed", at: now(), status: "failed", text: message });
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_run_failed", targetType: "agent_run", targetId: run.id, outcome: "failure", metadata: JSON.stringify({ error: message }) });
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_stream_error", targetType: "agent_run", targetId: run.id, outcome: "failure", metadata: JSON.stringify({ error: message }) });
    }
  }

  async listRunEvents(ctx: AppContext, input: { runId?: string; sessionId?: string }) {
    return this.repos.agentBuilder.listRunEvents(input);
  }

  async listMessages(ctx: AppContext, sessionId: string) {
    return this.repos.agentBuilder.listMessages({ sessionId });
  }

  private async appendEvent(event: Omit<RunEvent, "id">) {
    return this.repos.agentBuilder.addEvent(RunEventSchema.omit({ id: true }).parse(event));
  }
}

export function normalizeRunStatus(events: Array<{ type: string; status?: RunStatus }>): RunStatus {
  const terminal = [...events].reverse().find((event) => event.status);
  return terminal?.status ?? "created";
}
