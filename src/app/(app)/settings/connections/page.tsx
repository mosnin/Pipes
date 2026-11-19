import type { Metadata } from "next";
import { ConnectionsView } from "@/components/connections/connections-view";

export const metadata: Metadata = { title: "Connections" };

export default function ConnectionsSettingsPage() {
  return <ConnectionsView />;
}
