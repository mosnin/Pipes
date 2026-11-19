import type { Metadata } from "next";
import { WorkspaceSecurityView } from "@/components/security/workspace-security";

export const metadata: Metadata = { title: "Security" };

export default function SecuritySettingsPage() {
  return <WorkspaceSecurityView />;
}
