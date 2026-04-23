"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button, Card, PageHeader } from "@/components/ui";

export default function InviteAcceptPage() {
  const [status, setStatus] = useState("Ready");
  const params = useParams<{ token: string }>();

  return (
    <div>
      <PageHeader title="Workspace Invite" subtitle="Accept your invitation to join Pipes." />
      <Card>
        <Button onClick={async () => {
          const token = params.token;
          const res = await fetch(`/api/invites/${token}/accept`, { method: "POST" });
          const data = await res.json();
          setStatus(data.ok ? "Accepted" : data.error ?? "Failed");
        }}>Accept invite</Button>
        <p>{status}</p>
      </Card>
    </div>
  );
}
