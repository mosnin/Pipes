"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Mail,
  Users,
  XCircle,
} from "lucide-react";
import {
  CardShell,
  CardBody,
  CardFooter,
  CardHeader,
  Spinner,
  StatusBadge,
} from "@/components/ui";

type AcceptState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "accepted" }
  | { kind: "already_member" }
  | { kind: "invalid" }
  | { kind: "error"; message: string };

// Until invite metadata is wired through a server fetch, surface placeholder
// values so the layout reflects what the real card will show. The accept
// submission logic is unchanged from the prior implementation.
const PLACEHOLDER_INVITER = "Alex Rivera";
const PLACEHOLDER_WORKSPACE = "Acme AI";
const PLACEHOLDER_ROLE: "owner" | "admin" | "member" = "member";
const PLACEHOLDER_MESSAGE: string | null = null;

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

  // Accepted
  if (state.kind === "accepted") {
    return (
      <Shell>
        <ResultCard
          tone="success"
          icon={<CheckCircle2 className="w-6 h-6 text-[#059669]" aria-hidden="true" />}
          title="You are in!"
          description="Your invitation has been accepted. You now have access to the workspace."
          primaryLabel="Go to dashboard"
          onPrimary={() => router.push("/dashboard")}
        />
      </Shell>
    );
  }

  // Already a member
  if (state.kind === "already_member") {
    return (
      <Shell>
        <ResultCard
          tone="info"
          icon={<Users className="w-6 h-6 text-indigo-600" aria-hidden="true" />}
          title="You have already joined"
          description="Your account is already a member of this workspace. Head to your dashboard to continue."
          primaryLabel="Go to dashboard"
          onPrimary={() => router.push("/dashboard")}
        />
      </Shell>
    );
  }

  // Invalid / expired
  if (state.kind === "invalid") {
    return (
      <Shell>
        <ResultCard
          tone="danger"
          icon={<XCircle className="w-6 h-6 text-[#DC2626]" aria-hidden="true" />}
          title="This invitation is no longer valid"
          description="The link may have expired or already been used. Ask the workspace owner to send a new invite."
          primaryLabel="Back to home"
          primaryGhost
          onPrimary={() => router.push("/")}
        />
      </Shell>
    );
  }

  // Idle / loading / error
  const isLoading = state.kind === "loading";
  const inviterInitials = PLACEHOLDER_INVITER.split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Shell>
      <CardShell className="w-full max-w-md shadow-sm-token">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100">
              <Mail className="w-5 h-5 text-indigo-600" aria-hidden="true" />
            </span>
            <h1 className="t-h3 text-[#111]">You have been invited</h1>
          </div>
        </CardHeader>

        <CardBody>
          <div className="flex items-center gap-3 rounded-lg border border-black/[0.06] bg-[#FAFAFA] p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white t-label font-semibold">
              {inviterInitials}
            </span>
            <div className="flex-1 min-w-0">
              <p className="t-label text-[#3C3C43]">
                <span className="font-semibold text-[#111]">{PLACEHOLDER_INVITER}</span>{" "}
                invited you to join
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <GitBranch size={12} className="text-[#8E8E93]" aria-hidden="true" />
                <span className="t-caption text-[#3C3C43]">/invites</span>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="t-caption text-[#8E8E93]">Workspace</p>
            <p className="mt-1 t-h3 text-[#111]">{PLACEHOLDER_WORKSPACE}</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="t-caption text-[#8E8E93]">Role</span>
              <StatusBadge tone="info">
                <Users className="w-3 h-3" aria-hidden="true" />
                <span className="capitalize">{PLACEHOLDER_ROLE}</span>
              </StatusBadge>
            </div>
          </div>

          {PLACEHOLDER_MESSAGE != null && (
            <div className="mt-4 rounded-lg border border-black/[0.06] bg-white p-3">
              <p className="t-label text-[#3C3C43] leading-relaxed">
                {PLACEHOLDER_MESSAGE}
              </p>
            </div>
          )}

          {state.kind === "error" && (
            <p
              role="alert"
              className="mt-4 t-caption text-[#991B1B] bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg px-3 py-2"
            >
              {state.message}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={handleAccept}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg t-label transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading && <Spinner size="sm" />}
              Accept invite
              {!isLoading && <ArrowRight size={14} aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              disabled={isLoading}
              className="w-full h-10 bg-white border border-black/[0.14] hover:border-black/[0.24] text-[#3C3C43] font-medium rounded-lg t-label transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              Decline
            </button>
          </div>
        </CardBody>

        <CardFooter className="!justify-center">
          <p className="t-caption text-[#8E8E93]">
            By accepting, you agree to the workspace{" "}
            <a
              href="/terms"
              className="text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Terms
            </a>
            .
          </p>
        </CardFooter>
      </CardShell>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Layout shell
// ---------------------------------------------------------------------------

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen surface-subtle flex items-center justify-center px-4 py-12">
      {children}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Result card (shared by accepted / already_member / invalid states)
// ---------------------------------------------------------------------------

function ResultCard({
  tone,
  icon,
  title,
  description,
  primaryLabel,
  primaryGhost = false,
  onPrimary,
}: {
  tone: "success" | "info" | "danger";
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
        : "bg-indigo-50 border-indigo-100";

  return (
    <CardShell className="w-full max-w-md shadow-sm-token">
      <CardBody>
        <div className="flex flex-col items-center gap-4 text-center py-2">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full border ${ringClass}`}
          >
            {icon}
          </span>
          <div>
            <h1 className="t-h3 text-[#111]">{title}</h1>
            <p className="mt-1.5 t-label text-[#3C3C43] leading-relaxed">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={onPrimary}
            className={`w-full h-10 font-semibold rounded-lg t-label transition-colors mt-2 ${
              primaryGhost
                ? "bg-white border border-black/[0.14] hover:border-black/[0.24] text-[#111]"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {primaryLabel}
          </button>
        </div>
      </CardBody>
    </CardShell>
  );
}
