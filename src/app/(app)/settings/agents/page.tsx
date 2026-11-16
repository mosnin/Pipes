import type { Metadata } from "next";
import { ConnectAgentView } from "@/components/connections/connect-agent-view";

export const metadata: Metadata = { title: "Connect an agent" };

export default function ConnectAgentPage() {
  return <ConnectAgentView />;
}
