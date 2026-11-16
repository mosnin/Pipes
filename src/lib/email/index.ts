import { env, runtimeFlags } from "@/lib/env";

export interface EmailService {
  sendWorkspaceInvite(input: { email: string; workspaceName: string; inviterName: string; acceptUrl: string; role: string }): Promise<{ accepted: boolean }>;
  sendSystemCommentDigest(email: string, systemName: string): Promise<{ accepted: boolean }>;
  sendPasswordReset(input: { email: string; name?: string; resetUrl: string }): Promise<{ accepted: boolean }>;
}

class MockEmailService implements EmailService {
  async sendWorkspaceInvite(input: { email: string; workspaceName: string; inviterName: string; acceptUrl: string; role: string }) {
    console.info("[mock-email] invite", input);
    return { accepted: true };
  }

  async sendSystemCommentDigest() {
    return { accepted: true };
  }

  async sendPasswordReset(input: { email: string; resetUrl: string }) {
    console.info("[mock-email] password reset", input);
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

  async sendPasswordReset(input: { email: string; name?: string; resetUrl: string }) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: process.env.PIPES_EMAIL_FROM || "Pipes <noreply@pipes.local>",
        to: [input.email],
        subject: "Reset your Pipes password",
        text: `Hi${input.name ? ` ${input.name}` : ""},\n\nUse this link within an hour to choose a new password:\n${input.resetUrl}\n\nIf you did not ask for this, you can ignore this email.`
      })
    });
    return { accepted: response.ok };
  }
}

export function getEmailService(): EmailService {
  if (runtimeFlags.useMocks || !runtimeFlags.hasResend) return new MockEmailService();
  return new ResendEmailService();
}
