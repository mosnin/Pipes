import Link from "next/link";
import { Button, Card, PageHeader } from "@/components/ui";

export default function LoginPage() {
  return (
    <div>
      <PageHeader title="Login" subtitle="Authenticate through Auth0 in production, mock identity in local mode." />
      <Card>
        <p>Pipes uses Auth0 behind an internal auth boundary. In mock mode this button creates a local session.</p>
        <Link href="/api/auth/login?returnTo=/dashboard">
          <Button>Continue</Button>
        </Link>
        <p>Need an account? <Link href="/signup">Create one</Link>.</p>
      </Card>
    </div>
  );
}
