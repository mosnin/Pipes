import type { Metadata } from "next";
import { EditorWorkspace } from "@/components/editor/EditorWorkspace";

type Props = { params: Promise<{ systemId: string }> };

export const metadata: Metadata = { title: "Workflow editor" };

export default async function SystemEditorPage({ params }: Props) {
  const { systemId } = await params;
  return <EditorWorkspace systemId={systemId} />;
}
