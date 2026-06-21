"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  CardShell,
  CardHeader,
  CardBody,
  PageHeader,
  Textarea,
} from "@/components/ui";

type FeedbackType = "bug" | "feature" | "other";

export default function FeedbackPage() {
  const [type, setType] = useState<FeedbackType>("feature");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast.success("Feedback sent. Thank you!");
      setMessage("");
      setSubmitted(true);
    } catch {
      toast.error("Could not send feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Feedback"
        subtitle="Tell us what is working, what is broken, or what you wish Looper could do."
      />

      {submitted ? (
        <CardShell>
          <CardBody>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                <span className="text-xl text-green-600">&#10003;</span>
              </div>
              <p className="t-label font-medium text-[#111]">Feedback received</p>
              <p className="t-caption text-[#8E8E93]">
                We read every submission. If you reported a bug or asked for a feature, we may
                follow up by email.
              </p>
              <Button variant="outline" size="sm" onPress={() => setSubmitted(false)}>
                Send more feedback
              </Button>
            </div>
          </CardBody>
        </CardShell>
      ) : (
        <CardShell>
          <CardHeader>Send feedback</CardHeader>
          <CardBody>
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                {(["bug", "feature", "other"] as FeedbackType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={[
                      "px-3 py-1.5 rounded-lg t-label capitalize transition-colors",
                      type === t
                        ? "bg-indigo-600 text-white"
                        : "bg-[#F5F5F7] text-[#3C3C43] hover:bg-indigo-50 hover:text-indigo-700",
                    ].join(" ")}
                  >
                    {t === "bug" ? "Bug report" : t === "feature" ? "Feature request" : "Other"}
                  </button>
                ))}
              </div>
              <Textarea
                aria-label="Feedback message"
                placeholder={
                  type === "bug"
                    ? "Describe what happened and what you expected..."
                    : type === "feature"
                      ? "Describe the feature and the problem it solves..."
                      : "What is on your mind?"
                }
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <Button
                variant="primary"
                size="sm"
                onPress={() => void handleSubmit()}
                isDisabled={submitting || !message.trim()}
              >
                {submitting ? "Sending..." : "Send feedback"}
              </Button>
            </div>
          </CardBody>
        </CardShell>
      )}

      <CardShell>
        <CardHeader>Other ways to reach us</CardHeader>
        <CardBody>
          <div className="flex flex-col divide-y divide-black/[0.06]">
            {[
              {
                label: "GitHub issues",
                description: "Bug reports and feature requests with full context",
                href: "https://github.com/mosnin/Pipes/issues",
              },
              {
                label: "Email support",
                description: "Billing, data, and enterprise inquiries",
                href: "mailto:support@looper.dev",
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="t-label font-medium text-[#111]">{item.label}</p>
                  <p className="t-caption text-[#8E8E93]">{item.description}</p>
                </div>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="t-caption text-indigo-600 hover:text-indigo-700 shrink-0"
                >
                  Open
                </a>
              </div>
            ))}
          </div>
        </CardBody>
      </CardShell>
    </div>
  );
}
