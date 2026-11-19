import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/marketing/auth-frame";
import { TwoStepForm } from "@/components/marketing/password-forms";
import { cookies } from "next/headers";
import { safeReturnTo } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Two-step sign-in", description: "Enter the code from your authenticator app." };
export const dynamic = "force-dynamic";

/** The second step of sign-in. Only reachable for five minutes after a correct password. */
export default async function TwoStepPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  // Better Auth sets this cookie for five minutes after a correct password on an account with two-step sign-in.
  const challenged = (await cookies()).getAll().some((c) => c.name.endsWith("pipes.two_factor"));
  if (!challenged) redirect("/login");
  return (
    <AuthFrame
      title="Two-step sign-in"
      subtitle="Open your authenticator app and enter the code it shows for Pipes."
      footer={
        <Link href="/login" className="t-link focus-ring-canvas rounded-2 focus-visible:outline-none">
          Sign in as someone else
        </Link>
      }
    >
      <TwoStepForm returnTo={safeReturnTo(returnTo)} />
    </AuthFrame>
  );
}
