"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, Button, Chip, Spinner } from "@heroui/react";
import { Users, CheckCircle2, XCircle, Mail } from "lucide-react";

type AcceptState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "accepted" }
  | { kind: "already_member" }
  | { kind: "invalid" }
  | { kind: "error"; message: string };

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [state, setState] = useState<AcceptState>({ kind: "idle" });

  async function handleAccept() {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/invites/${params.token}/accept`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setState({ kind: "accepted" });
        return;
      }

      const msg: string = data.error ?? "Something went wrong.";

      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("member")) {
        setState({ kind: "already_member" });
      } else if (
        msg.toLowerCase().includes("invalid") ||
        msg.toLowerCase().includes("expired") ||
        msg.toLowerCase().includes("not found") ||
        msg.toLowerCase().includes("pending")
      ) {
        setState({ kind: "invalid" });
      } else {
        setState({ kind: "error", message: msg });
      }
    } catch {
      setState({ kind: "error", message: "Network error. Please try again." });
    }
  }

  // ── Accepted ──────────────────────────────────────────────────────────────
  if (state.kind === "accepted") {
    return (
      <PageShell>
        <Card className="border border-slate-200 w-full max-w-md">
          <Card.Content className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                You&apos;re in!
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Your invitation has been accepted. You now have access to the workspace.
              </p>
            </div>
            <Button
              onPress={() => router.push("/dashboard")}
              className="bg-slate-900 text-white font-semibold w-full mt-2 hover:bg-slate-800 transition-colors"
            >
              Go to dashboard
            </Button>
          </Card.Content>
        </Card>
      </PageShell>
    );
  }

  // ── Already a member ──────────────────────────────────────────────────────
  if (state.kind === "already_member") {
    return (
      <PageShell>
        <Card className="border border-slate-200 w-full max-w-md">
          <Card.Content className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100">
              <Users className="w-7 h-7 text-indigo-500" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                You&apos;ve already joined this workspace
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Your account is already a member. Head to your dashboard to continue.
              </p>
            </div>
            <Button
              onPress={() => router.push("/dashboard")}
              className="bg-slate-900 text-white font-semibold w-full mt-2 hover:bg-slate-800 transition-colors"
            >
              Go to dashboard
            </Button>
          </Card.Content>
        </Card>
      </PageShell>
    );
  }

  // ── Invalid / expired ─────────────────────────────────────────────────────
  if (state.kind === "invalid") {
    return (
      <PageShell>
        <Card className="border border-slate-200 w-full max-w-md">
          <Card.Content className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 border border-red-100">
              <XCircle className="w-7 h-7 text-red-500" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                This invitation is no longer valid
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                The link may have expired or already been used. Ask the workspace
                owner to send a new invite.
              </p>
            </div>
            <Button
              variant="outline"
              onPress={() => router.push("/")}
              className="border-slate-300 text-slate-700 font-medium w-full mt-2 hover:border-slate-500 transition-colors"
            >
              Back to home
            </Button>
          </Card.Content>
        </Card>
      </PageShell>
    );
  }

  // ── Idle / loading / error (default accept UI) ────────────────────────────
  const isLoading = state.kind === "loading";

  return (
    <PageShell>
      <Card className="border border-slate-200 w-full max-w-md">
        <Card.Content className="p-8 flex flex-col items-center gap-5 text-center">
          {/* Icon */}
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100">
            <Mail className="w-7 h-7 text-indigo-500" aria-hidden />
          </div>

          {/* Copy */}
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              You&apos;ve been invited to join a workspace
            </h1>
            <p className="text-sm text-slate-500">
              Accept below to gain access and start collaborating.
            </p>
          </div>

          {/* Role chip */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Role:</span>
            <Chip
              size="sm"
              color="default"
              variant="soft"
              className="font-semibold capitalize"
            >
              <Users className="w-3 h-3 mr-1" aria-hidden />
              Member
            </Chip>
          </div>

          {/* Error banner */}
          {state.kind === "error" && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2 w-full">
              {state.message}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 w-full mt-1">
            <Button
              onPress={handleAccept}
              className="bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
            >
              {isLoading && <Spinner size="sm" />}
              Accept invitation
            </Button>

            <button
              type="button"
              onClick={() => router.push("/")}
              disabled={isLoading}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors disabled:pointer-events-none"
            >
              Decline
            </button>
          </div>
        </Card.Content>
      </Card>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16">
      {children}
    </div>
  );
}
