import type { Metadata } from "next";
import { WorkflowRailsView } from "@/components/rails/rails-views";

type Props = { params: Promise<{ systemId: string }> };

export const metadata: Metadata = { title: "Rails" };

export default async function WorkflowRailsPage({ params }: Props) {
  const { systemId } = await params;
  return <WorkflowRailsView systemId={systemId} />;
}
