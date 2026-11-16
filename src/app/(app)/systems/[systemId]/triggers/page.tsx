import type { Metadata } from "next";
import { TriggersView } from "@/components/triggers/triggers-view";

type Props = { params: Promise<{ systemId: string }> };

export const metadata: Metadata = { title: "Triggers" };

export default async function SystemTriggersPage({ params }: Props) {
  const { systemId } = await params;
  return <TriggersView systemId={systemId} />;
}
