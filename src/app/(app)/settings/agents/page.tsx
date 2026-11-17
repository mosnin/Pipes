import type { Metadata } from "next";
import { ConnectAgentView } from "@/components/connections/connect-agent-view";
import { listSkills } from "@/lib/skills/catalog";

export const metadata: Metadata = { title: "Connect an agent" };

export default function ConnectAgentPage() {
  return <ConnectAgentView skills={listSkills().map((s) => ({ name: s.name, description: s.description }))} />;
}
