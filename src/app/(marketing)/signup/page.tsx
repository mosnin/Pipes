import { Card, PageHeader } from "@/components/ui";
import { SignupSourceTracker } from "@/components/marketing/SignupSourceTracker";
import { SignupForm } from "@/components/marketing/SignupForm";

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
        <SignupForm source={source} />
      </Card>
    </div>
  );
}
