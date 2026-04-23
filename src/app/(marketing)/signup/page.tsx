import { Card } from "@/components/ui";
import { SignupSourceTracker } from "@/components/marketing/SignupSourceTracker";
import { SignupForm } from "@/components/marketing/SignupForm";

export const metadata = {
  title: "Create workspace · Pipes",
  description: "Create a Pipes workspace to design reusable systems, review agent-assisted changes, and export implementation handoff."
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const params = await searchParams;
  const source = params.source ?? "direct";

  return (
    <div className="signup-shell">
      <SignupSourceTracker source={source} />
      <section>
        <p className="eyebrow">WORKSPACE SETUP</p>
        <h1>Create your Pipes workspace</h1>
        <p className="muted">You’ll start with your system library and a guided first build flow.</p>
      </section>
      <Card>
        <SignupForm source={source} />
      </Card>
    </div>
  );
}
