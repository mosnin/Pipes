import type { Metadata } from "next";
import Link from "next/link";
import { AuthFrame } from "@/components/marketing/auth-frame";
import { CutButton } from "@/components/marketing/cut-button";
import { SignupSourceTracker } from "@/components/marketing/SignupSourceTracker";
import { Card } from "@/components/ui/card";
import { getEntitlements } from "@/domain/templates/plans";

/* ==========================================================================
   ENROLMENT, /signup. Shell suppressed, as Company OS's /signup is.

   Accounts are created by the identity provider, so there is no form here to
   fill in. What this page can do is show what happens next: the real route
   sequence after sign-in is account, then onboarding, then a first workflow.
   `?source=` is recorded on arrival and carried on the click.
   ========================================================================== */

export const metadata: Metadata = {
  title: "Create your workspace",
  description:
    "Create a free Pipes workspace and design your first agent workflow from a template, a blank canvas or an imported schema.",
};

const STEPS = ["Account", "Workspace", "First workflow"] as const;

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const params = await searchParams;
  const source = params.source ?? "direct";
  const free = getEntitlements("Free");

  return (
    <AuthFrame
      width={480}
      title="Create your workspace"
      subtitle="One sign-in, then a workspace for your team's procedures."
      footer={
        <>
          Already have access?{" "}
          <Link href="/login" className="t-link focus-ring-canvas rounded-2 focus-visible:outline-none">
            Log in
          </Link>
        </>
      }
    >
      <SignupSourceTracker source={source} />
      <div className="flex flex-col gap-8">
        <ol className="flex flex-wrap items-center justify-center gap-4">
          {STEPS.map((step, index) => (
            <li key={step} className="flex items-center gap-4">
              {index > 0 ? <span aria-hidden="true" className="h-px w-[16px] bg-strong" /> : null}
              <span className={index === 0 ? "t-label-caps text-ink" : "t-label-caps text-ink-3"}>
                {step}
              </span>
            </li>
          ))}
        </ol>
        <Card className="flex flex-col gap-6 p-7">
          <dl className="flex flex-col divide-y divide-hairline">
            <div className="flex flex-col gap-1 pb-5">
              <dt className="t-body-strong text-ink">Free to start</dt>
              <dd className="t-body text-ink-2">
                Up to {free.maxSystems} workflows, with validation and simulation.
              </dd>
            </div>
            <div className="flex flex-col gap-1 pt-5">
              <dt className="t-body-strong text-ink">Then pick a starting point</dt>
              <dd className="t-body text-ink-2">
                A template, a blank canvas or an imported schema. Onboarding suggests one.
              </dd>
            </div>
          </dl>
          <CutButton
            href="/api/auth/login?returnTo=/onboarding"
            size="lg"
            className="w-full"
            track={{ event: "signup_started", metadata: { source } }}
          >
            Start free workspace
          </CutButton>
        </Card>
      </div>
    </AuthFrame>
  );
}
