"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Users, XCircle } from "lucide-react";
import { Spinner, StatusBadge } from "@/components/ui";

type AcceptState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "accepted" }
  | { kind: "already_member" }
  | { kind: "invalid" }
  | { kind: "error"; message: string };

type InviteInfo = {
  workspaceName: string;
  role: "owner" | "admin" | "member";
  email: string;
};

export type InviteFormProps = {
  token: string;
};

export function InviteForm({ token }: InviteFormProps) {
  const router = useRouter();
  const [state, setState] = useState<AcceptState>({ kind: "idle" });
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/invites/${token}`);
        const data = await res.json();
        if (res.ok && data.ok) {
          setInviteInfo(data.data as InviteInfo);
        }
      } catch {
        // best-effort — fall back to generic copy
      } finally {
        setInfoLoading(false);
      }
    })();
  }, [token]);

  async function handleAccept() {
    setState({ kind: "loading" });
    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setState({ kind: "accepted" });
        return;
      }
      const msg: string = data.error ?? "Something went wrong.";
      if (
        msg.toLowerCase().includes("already") ||
        msg.toLowerCase().includes("member")
      ) {
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

  if (state.kind === "accepted") {
    return (
      <ResultPanel
        tone="success"
        icon={
          <CheckCircle2 className="w-7 h-7 text-[#059669]" aria-hidden="true" />
        }
        title="You are in."
        description="Your workspace is ready. Open the dashboard to see what your team is shipping."
        primaryLabel="Go to dashboard"
        onPrimary={() => router.push("/dashboard")}
      />
    );
  }

  if (state.kind === "already_member") {
    return (
      <ResultPanel
        tone="info"
        icon={<Users className="w-7 h-7 text-violet-600" aria-hidden="true" />}
        title="You already joined."
        description="This account is already on the workspace. Head to the dashboard."
        primaryLabel="Go to dashboard"
        onPrimary={() => router.push("/dashboard")}
      />
    );
  }

  if (state.kind === "invalid") {
    return (
      <ResultPanel
        tone="danger"
        icon={<XCircle className="w-7 h-7 text-[#DC2626]" aria-hidden="true" />}
        title="This invite is no longer valid."
        description="The link expired or was used. Ask the workspace owner to send a new one."
        primaryLabel="Back to home"
        primaryGhost
        onPrimary={() => router.push("/")}
      />
    );
  }

  const isLoading = state.kind === "loading";
  const workspaceName = inviteInfo?.workspaceName ?? "a workspace";
  const role = inviteInfo?.role ?? "member";
  const workspaceInitials = workspaceName
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-full max-w-sm mx-auto">
      <h1 className="t-h1 text-[#111]">You have been invited.</h1>
      <p className="mt-3 t-body text-[#3C3C43]">
        Accept to join the workspace and start reviewing systems with your team.
      </p>

      <div className="mt-8 rounded-2xl border border-black/[0.06] bg-white p-5">
        {infoLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white t-label font-semibold">
                {workspaceInitials}
              </span>
              <div className="flex-1 min-w-0">
                <p className="t-label text-[#3C3C43]">
                  <span className="font-semibold text-[#111]">A teammate</span>{" "}
                  invited you to
                </p>
                <p className="mt-0.5 t-title text-[#111] truncate">
                  {workspaceName}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="t-caption text-[#8E8E93]">Role</span>
              <StatusBadge tone="info">
                <span className="capitalize">{role}</span>
              </StatusBadge>
            </div>
          </>
        )}
      </div>

      {state.kind === "error" && (
        <p
          role="alert"
          className="mt-4 t-caption text-[#991B1B] bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg px-3 py-2"
        >
          {state.message}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={handleAccept}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 w-full h-11 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg t-label transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading && <Spinner size="sm" />}
          Accept invite
          {!isLoading && <ArrowRight size={14} aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={() => router.push("/")}
          disabled={isLoading}
          className="w-full h-11 bg-white border border-black/[0.14] hover:border-black/[0.24] text-[#3C3C43] font-medium rounded-lg t-label transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          Decline
        </button>
      </div>

      <p className="mt-6 t-caption text-[#8E8E93]">
        By accepting, you agree to the workspace{" "}
        <a
          href="/terms"
          className="text-violet-600 hover:text-violet-700 transition-colors"
        >
          Terms
        </a>
        .
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

type ResultTone = "success" | "info" | "danger";

function ResultPanel({
  tone,
  icon,
  title,
  description,
  primaryLabel,
  primaryGhost = false,
  onPrimary,
}: {
  tone: ResultTone;
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryLabel: string;
  primaryGhost?: boolean;
  onPrimary: () => void;
}) {
  const ringClass =
    tone === "success"
      ? "bg-[#ECFDF5] border-[#A7F3D0]"
      : tone === "danger"
        ? "bg-[#FEF2F2] border-[#FCA5A5]"
        : "bg-violet-50 border-violet-100";

  return (
    <div className="w-full max-w-sm mx-auto">
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full border ${ringClass}`}
      >
        {icon}
      </span>
      <h1 className="mt-6 t-h1 text-[#111]">{title}</h1>
      <p className="mt-3 t-body text-[#3C3C43] leading-relaxed">{description}</p>
      <button
        type="button"
        onClick={onPrimary}
        className={`mt-6 w-full h-11 font-semibold rounded-lg t-label transition-colors ${
          primaryGhost
            ? "bg-white border border-black/[0.14] hover:border-black/[0.24] text-[#111]"
            : "bg-violet-600 hover:bg-violet-700 text-white"
        }`}
      >
        {primaryLabel}
      </button>
    </div>
  );
}
