import { EditorWorkspace } from "@/components/editor/EditorWorkspace";

type Props = { params: Promise<{ systemId: string }> };

export default async function SystemEditorPage({ params }: Props) {
  const { systemId } = await params;
  return <EditorWorkspace systemId={systemId} />;
}
