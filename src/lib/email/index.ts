import { env, runtimeFlags } from "@/lib/env";

export interface EmailService {
  sendWorkspaceInvite(input: { email: string; workspaceName: string; inviterName: string; acceptUrl: string; role: string }): Promise<{ accepted: boolean }>;
  sendSystemCommentDigest(email: string, systemName: string): Promise<{ accepted: boolean }>;
}

class MockEmailService implements EmailService {
  async sendWorkspaceInvite(input: { email: string; workspaceName: string; inviterName: string; acceptUrl: string; role: string }) {
    console.info("[mock-email] invite", input);
    return { accepted: true };
  }

  async sendSystemCommentDigest() {
    return { accepted: true };
  }
}

class ResendEmailService implements EmailService {
  async sendWorkspaceInvite(input: { email: string; workspaceName: string; inviterName: string; acceptUrl: string; role: string }) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "authorization": `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: "Pipes <noreply@pipes.local>",
        to: [input.email],
        subject: `${input.inviterName} invited you to ${input.workspaceName}`,
        text: `You've been invited as ${input.role}. Accept invite: ${input.acceptUrl}`
      })
    });
    return { accepted: response.ok };
  }

  async sendSystemCommentDigest() {
    return { accepted: true };
  }
}

export function getEmailService(): EmailService {
  if (runtimeFlags.useMocks || !runtimeFlags.hasResend) return new MockEmailService();
  return new ResendEmailService();
}
