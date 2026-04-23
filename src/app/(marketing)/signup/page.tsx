import Link from "next/link";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import { SignupSourceTracker } from "@/components/marketing/SignupSourceTracker";

export const metadata = {
  title: "Sign up · Pipes",
  description: "Create a Pipes workspace for structured system design, validation, and protocol-ready handoff."
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const params = await searchParams;
  const source = params.source ?? "direct";
  return (
    <div>
      <SignupSourceTracker source={source} />
      <PageHeader title="Create your workspace" subtitle="Start in mock mode locally, then connect production providers when ready." />
      <Card>
        <Input placeholder="Work email" />
        <div style={{ height: 8 }} />
        <Input placeholder="Workspace name" />
        <div style={{ height: 12 }} />
        <TrackedLink href="/api/auth/login?returnTo=/onboarding" event="signup_started" metadata={{ source }}><Button>Start free workspace</Button></TrackedLink>
        <p>Entry source: <code>{source}</code></p>
        <p>Already have access? <Link href="/login">Sign in</Link>.</p>
      </Card>
    </div>
  );
}
