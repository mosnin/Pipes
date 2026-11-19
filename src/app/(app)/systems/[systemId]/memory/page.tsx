import type { Metadata } from "next";
import { WorkflowMemoryView } from "@/components/memory/memory-view";

type Props = { params: Promise<{ systemId: string }> };

export const metadata: Metadata = { title: "Memory" };

export default async function WorkflowMemoryPage({ params }: Props) {
  const { systemId } = await params;
  return <WorkflowMemoryView systemId={systemId} />;
}
