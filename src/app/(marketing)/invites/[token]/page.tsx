"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthFrame } from "@/components/marketing/auth-frame";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/components/shell/api-error";

type Invite = { status: "pending" | "accepted" | "canceled" | "cancelled" | "expired"; valid: boolean; email: string; role: string };

type State =
  | { kind: "checking" }
  | { kind: "invalid"; reason: string }
  | { kind: "ready"; invite: Invite }
  | { kind: "pending"; invite: Invite }
  | { kind: "accepted" }
  | { kind: "failed"; invite: Invite; message: string };

const INVALID_REASON: Record<string, string> = {
  accepted: "It has already been accepted. If that was you, open the workspace.",
  canceled: "Whoever sent it has cancelled it. Ask them for a new one.",
  cancelled: "Whoever sent it has cancelled it. Ask them for a new one.",
  expired: "It has expired. Invites last seven days, so ask whoever sent it for a new one."
};

export default function InviteAcceptPage() {
  const [state, setState] = useState<State>({ kind: "checking" });
  const params = useParams<{ token: string }>();

  useEffect(() => {
    let live = true;
    fetch(`/api/invites/${encodeURIComponent(params.token)}`, { cache: "no-store" })
      .then(async (res) => ({ res, json: await res.json().catch(() => null) }))
      .then(({ res, json }) => {
        if (!live) return;
        if (json?.ok && json.data?.valid) return setState({ kind: "ready", invite: json.data as Invite });
        if (json?.ok) return setState({ kind: "invalid", reason: INVALID_REASON[json.data?.status] ?? "Ask whoever sent it for a new one." });
        setState({
          kind: "invalid",
          reason: res.status === 404 ? "The link may be mistyped or incomplete. Ask whoever sent it for a new one." : apiErrorMessage(json, "It could not be checked. Try again.")
        });
      })
      .catch(() => live && setState({ kind: "invalid", reason: "It could not be checked. Check your connection and try again." }));
    return () => {
      live = false;
    };
  }, [params.token]);

  async function accept(invite: Invite) {
    setState({ kind: "pending", invite });
    try {
      const res = await fetch(`/api/invites/${encodeURIComponent(params.token)}/accept`, { method: "POST" });
      const data = await res.json().catch(() => null);
      setState(data?.ok ? { kind: "accepted" } : { kind: "failed", invite, message: apiErrorMessage(data, "The invite could not be accepted. Try again.") });
    } catch {
      setState({ kind: "failed", invite, message: "Pipes could not be reached. Check your connection and try again." });
    }
  }

  const invite = state.kind === "ready" || state.kind === "pending" || state.kind === "failed" ? state.invite : null;

  return (
    <AuthFrame
      title={state.kind === "invalid" ? "This invite is not valid" : "Join a workspace"}
      subtitle={
        state.kind === "invalid"
          ? state.reason
          : invite
            ? `You have been invited to a Pipes workspace as ${invite.role === "Admin" ? "an" : "a"} ${invite.role.toLowerCase()}.`
            : "You have been invited to a Pipes workspace."
      }
    >
      <div className="flex flex-col gap-6" aria-live="polite">
        {state.kind === "checking" ? (
          <Skeleton className="h-[44px] w-full rounded-10" />
        ) : state.kind === "invalid" ? (
          <Button asChild variant="secondary" size="lg" className="w-full">
            <Link href="/dashboard">Go to Pipes</Link>
          </Button>
        ) : state.kind === "accepted" ? (
          <>
            <Banner role="positive" title="Invite accepted">
              You are now a member of the workspace.
            </Banner>
            <Button asChild variant="primary" size="lg" className="w-full">
              <Link href="/dashboard">Open the workspace</Link>
            </Button>
          </>
        ) : invite ? (
          <>
            {state.kind === "failed" ? (
              <div role="alert">
                <Banner role="critical" title="The invite could not be accepted">
                  {state.message}
                </Banner>
              </div>
            ) : null}
            <p className="t-caption text-center text-ink-3">
              Sent to <span className="text-ink-2">{invite.email}</span>
            </p>
            <Button variant="primary" size="lg" className="w-full" loading={state.kind === "pending"} onClick={() => accept(invite)}>
              Accept invite
            </Button>
          </>
        ) : null}
      </div>
    </AuthFrame>
  );
}
