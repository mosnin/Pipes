import { getServerApp } from "@/lib/composition/server";
import { AgentRunService } from "@/domain/services/agent_builder";

export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const { ctx, repositories } = await getServerApp();
  const body = await request.json();
  const service = new AgentRunService(repositories);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
      try {
        await service.streamRun(ctx, {
          runId,
          message: body.message,
          systemName: body.systemName,
          systemDescription: body.systemDescription,
          onEvent: async (event) => {
            send(event);
          }
        });
      } catch (error) {
        send({ type: "run_failed", text: (error as Error).message });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive"
    }
  });
}
