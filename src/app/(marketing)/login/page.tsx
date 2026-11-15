import Link from "next/link";
import { Button, Card, PageHeader } from "@/components/ui";

const ERROR_MESSAGES: Record<string, string> = {
  auth_not_configured: "Sign-in isn't configured on this deployment yet.",
  invalid_login_state: "That sign-in attempt expired or didn't match. Please try again.",
  token_exchange_failed: "We couldn't complete sign-in with the identity provider. Please try again.",
  profile_fetch_failed: "We couldn't load your profile from the identity provider. Please try again.",
  profile_incomplete: "Your identity provider didn't share an email address, which Pipes needs to sign you in."
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const message = error ? ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again." : undefined;
  return (
    <div>
      <PageHeader title="Log in" subtitle="Sign in to your Pipes workspace." />
      <Card>
        {message ? <p role="alert">{message}</p> : null}
        <Link href="/api/auth/login?returnTo=/dashboard">
          <Button>Continue</Button>
        </Link>
        <p>Need an account? <Link href="/signup">Create one</Link>.</p>
      </Card>
    </div>
  );
}
