import type { Metadata } from "next";
import Link from "next/link";
import { AuthFrame } from "@/components/marketing/auth-frame";
import { ForgotPasswordForm } from "@/components/marketing/password-forms";

/* ==========================================================================
   GATE, /forgot-password. Shell suppressed, like /login.

   One field. The answer is the same whether or not the email has an
   account, so the page never tells anyone who signs in to Pipes.
   ========================================================================== */

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Get a link to set a new Pipes password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthFrame
      title="Reset your password"
      subtitle="Enter the email you sign in with and we'll send a link to set a new one."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="t-link focus-ring-canvas rounded-2 focus-visible:outline-none">
            Log in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthFrame>
  );
}
