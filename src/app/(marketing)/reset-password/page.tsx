import type { Metadata } from "next";
import Link from "next/link";
import { AuthFrame } from "@/components/marketing/auth-frame";
import { ResetPasswordForm } from "@/components/marketing/password-forms";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";

/* ==========================================================================
   GATE, /reset-password?token=. Shell suppressed, like /login.

   The link from the reset email lands here. A new password signs you in and
   moves you on; a link without a token says so and offers a new one.
   ========================================================================== */

export const metadata: Metadata = {
  title: "Set a new password",
  description: "Choose a new Pipes password.",
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthFrame
      title="Set a new password"
      subtitle="Choose a password you don't use anywhere else."
      footer={
        <>
          Need a new link?{" "}
          <Link href="/forgot-password" className="t-link focus-ring-canvas rounded-2 focus-visible:outline-none">
            Send another
          </Link>
        </>
      }
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="flex flex-col gap-4">
          <Banner role="critical" title="This reset link is missing its token">
            Open the link from the email again, or ask for a new one.
          </Banner>
          <Button asChild variant="primary" size="lg" className="w-full">
            <Link href="/forgot-password">Ask for a new link</Link>
          </Button>
        </div>
      )}
    </AuthFrame>
  );
}
