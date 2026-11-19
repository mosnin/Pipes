import type { Metadata } from "next";
import { RunDetailClient } from "@/components/runs/RunDetailClient";

type Props = { params: Promise<{ runId: string }> };

export const metadata: Metadata = { title: "Run" };

export default async function RunPage({ params }: Props) {
  const { runId } = await params;
  return <RunDetailClient runId={runId} />;
}
