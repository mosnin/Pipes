import type { ReactNode } from "react";
import { getServerApp } from "@/lib/composition/server";

// Welcome layout — fullscreen, no AppShell sidebar.
// The wizard takes the whole viewport so the user focuses on one decision per
// step. We still call getServerApp so the route stays auth-gated like every
// other (app) page.
export default async function WelcomeLayout({ children }: { children: ReactNode }) {
  await getServerApp();
  return <div className="min-h-screen bg-white">{children}</div>;
}
