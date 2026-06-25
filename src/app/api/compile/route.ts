import { NextResponse } from "next/server";
import { getServerApp } from "@/lib/composition/server";
import { failure, success } from "@/lib/api/response";
import { getDocumentCompiler, CompileRequestSchema } from "@/lib/ai/compiler";

export async function POST(request: Request) {
  try {
    await getServerApp();
    const body = await request.json();
    const req = CompileRequestSchema.parse(body);
    const compiler = getDocumentCompiler();
    const graph = await compiler.compile(req);
    return NextResponse.json(success(graph));
  } catch (error) {
    return NextResponse.json(failure((error as Error).message), { status: 400 });
  }
}
