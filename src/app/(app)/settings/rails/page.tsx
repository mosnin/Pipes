import type { Metadata } from "next";
import { WorkspaceRailsView } from "@/components/rails/rails-views";

export const metadata: Metadata = { title: "Execution rails" };

export default function WorkspaceRailsPage() {
  return <WorkspaceRailsView />;
}
