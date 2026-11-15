"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { AuthFrame } from "@/components/marketing/auth-frame";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";

type State =
  | { kind: "ready" }
  | { kind: "pending" }
  | { kind: "accepted" }
  | { kind: "failed"; message: string };

export default function InviteAcceptPage() {
  const [state, setState] = useState<State>({ kind: "ready" });
  const params = useParams<{ token: string }>();

  async function accept() {
    setState({ kind: "pending" });
    try {
      const res = await fetch(`/api/invites/${params.token}/accept`, { method: "POST" });
      const data = await res.json();
      setState(data.ok ? { kind: "accepted" } : { kind: "failed", message: data.error ?? "Failed" });
    } catch {
      setState({ kind: "failed", message: "Failed" });
    }
  }

  return (
    <AuthFrame title="Join a workspace" subtitle="You have been invited to a Pipes workspace.">
      <div className="flex flex-col gap-6" aria-live="polite">
        {state.kind === "accepted" ? (
          <>
            <Banner role="positive" title="Invite accepted">
              You are now a member of the workspace.
            </Banner>
            <Button asChild variant="primary" size="lg" className="w-full">
              <Link href="/dashboard">Open the workspace</Link>
            </Button>
          </>
        ) : (
          <>
            {state.kind === "failed" ? (
              <Banner role="critical" title="The invite could not be accepted">
                {state.message}
              </Banner>
            ) : null}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              loading={state.kind === "pending"}
              onClick={accept}
            >
              Accept invite
            </Button>
          </>
        )}
      </div>
    </AuthFrame>
  );
}
