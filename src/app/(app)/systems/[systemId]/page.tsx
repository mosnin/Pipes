import { EditorWorkspace } from "@/components/editor/EditorWorkspace";
import { MobileGate } from "@/components/mobile/MobileGate";
import { MobileSystemView } from "@/components/mobile/MobileSystemView";

type Props = {
  params: Promise<{ systemId: string }>;
  searchParams: Promise<{ prompt?: string | string[] }>;
};

export default async function SystemEditorPage({ params, searchParams }: Props) {
  const { systemId } = await params;
  const sp = await searchParams;
  const rawPrompt = Array.isArray(sp.prompt) ? sp.prompt[0] : sp.prompt;
  const initialPrompt = rawPrompt ? decodeURIComponent(rawPrompt) : undefined;
  return (
    <MobileGate mobile={<MobileSystemView systemId={systemId} initialPrompt={initialPrompt} />}>
      <EditorWorkspace systemId={systemId} initialPrompt={initialPrompt} />
    </MobileGate>
  );
}
