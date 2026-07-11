// In-memory subscriber store for dev/mock mode.
// In production, swap `persist` for a call to your email service
// (Resend, Mailchimp, ConvertKit, etc.).

export type SubscribeResult = "subscribed" | "already_subscribed";

const subscribers = new Set<string>();

export function subscribe(email: string): SubscribeResult {
  const normalized = email.trim().toLowerCase();
  if (subscribers.has(normalized)) return "already_subscribed";
  subscribers.add(normalized);
  // Log so emails are visible in server output even in dev/mock mode.
  console.log(`[newsletter] new subscriber: ${normalized} (total: ${subscribers.size})`);
  return "subscribed";
}

export function count(): number {
  return subscribers.size;
}
