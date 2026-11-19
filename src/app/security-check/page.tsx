import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/marketing/auth-frame";
import { SecurityCheck } from "@/components/security/security-check";
import { getServerApp } from "@/lib/composition/server";

export const metadata: Metadata = { title: "Security check" };
export const dynamic = "force-dynamic";

/**
 * Where the workspace's security policy sends someone who does not meet it
 * (docs/security.md): set up two-step sign-in, or learn that their email
 * domain is not allowed. Once the policy is met, it sends them on.
 */
export default async function SecurityCheckPage() {
  const { identity, blocked, policy } = await getServerApp({ skipPolicy: true });
  if (!blocked) redirect("/dashboard");
  return (
    <AuthFrame
      title={blocked === "two_step" ? "Set up two-step sign-in" : "This workspace is limited to certain emails"}
      subtitle={
        blocked === "two_step"
          ? "Your workspace asks every member to use it before they continue. It takes about a minute."
          : `You are signed in as ${identity.email}, but this workspace only allows emails at ${policy.allowedDomains.join(", ")}.`
      }
    >
      <SecurityCheck reason={blocked} />
    </AuthFrame>
  );
}
