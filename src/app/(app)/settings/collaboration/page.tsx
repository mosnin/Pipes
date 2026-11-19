import type { Metadata } from "next";
import { MembersView } from "@/components/settings/members-view";
import { getServerApp } from "@/lib/composition/server";

export const metadata: Metadata = { title: "Members" };

export default async function CollaborationSettingsPage() {
  const { identity, ctx } = await getServerApp();
  return <MembersView me={{ userId: ctx.userId, name: identity.name, email: identity.email, role: ctx.role }} />;
}
