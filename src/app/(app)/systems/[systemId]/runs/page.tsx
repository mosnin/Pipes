import type { Metadata } from "next";
import { SystemRunsClient } from "@/components/runs/SystemRunsClient";

type Props = { params: Promise<{ systemId: string }> };

export const metadata: Metadata = { title: "Run history" };

export default async function SystemRunsPage({ params }: Props) {
  const { systemId } = await params;
  return <SystemRunsClient systemId={systemId} />;
}
