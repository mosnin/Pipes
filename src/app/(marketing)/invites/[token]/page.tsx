"use client";

import { useParams } from "next/navigation";
import { AuthShell } from "@/components/marketing/AuthShell";
import { InviteForm } from "@/components/marketing/InviteForm";

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  return (
    <AuthShell breadcrumb="Accept invite">
      <InviteForm token={params.token} />
    </AuthShell>
  );
}
