"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, MessageSquare } from "lucide-react";
import {
  Button,
  CardShell,
  CardHeader,
  CardBody,
  CardFooter,
  HelpText,
  PageHeader,
  Spinner,
} from "@/components/ui";

type FeedbackTopic = "bug" | "ux" | "feature_request" | "reliability" | "billing" | "other";
type FeedbackSeverity = "low" | "medium" | "high";

const TOPIC_OPTIONS: Array<{ id: FeedbackTopic; label: string }> = [
  { id: "bug",             label: "Bug" },
  { id: "ux",              label: "UX" },
  { id: "feature_request", label: "Feature request" },
  { id: "reliability",     label: "Reliability" },
  { id: "billing",         label: "Billing" },
  { id: "other",           label: "Other" },
];

const SEVERITY_OPTIONS: Array<{ id: FeedbackSeverity; label: string }> = [
  { id: "low",    label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high",   label: "High" },
];

export default function FeedbackSettingsPage() {
  const [category, setCategory]               = useState<FeedbackTopic>("bug");
  const [severity, setSeverity]               = useState<FeedbackSeverity>("medium");
  const [summary, setSummary]                 = useState("");
  const [details, setDetails]                 = useState("");
  const [systemId, setSystemId]               = useState("");
  const [contactEmail, setContactEmail]       = useState("");
  const [submitting, setSubmitting]           = useState(false);
  const [summaryTouched, setSummaryTouched]   = useState(false);

  const remaining = Math.max(0, 8 - summary.trim().length);
  const summaryError =
    summaryTouched && summary.trim().length < 8
      ? `${remaining} more character${remaining === 1 ? "" : "s"} needed`
      : null;

  async function handleSubmit() {
    setSummaryTouched(true);
    if (summary.trim().length < 8) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category,
          severity,
          summary,
          details,
          systemId: systemId || undefined,
          contactEmail: contactEmail || undefined,
          page: window.location.pathname,
        }),
      });
      const body = await res.json();
      if (body.ok) {
        setSummary("");
        setDetails("");
        setSystemId("");
        setContactEmail("");
        setSummaryTouched(false);
        toast.success("Feedback submitted - thank you!");
      } else {
        toast.error(body.error ?? "Failed to submit feedback.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full h-10 rounded-lg border border-black/[0.08] bg-white px-3 t-label text-[#111] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
  const selectClass =
    "w-full h-10 rounded-lg border border-black/[0.08] bg-white px-3 t-label text-[#111] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
  const errorInputClass =
    "w-full h-10 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 t-label text-[#991B1B] outline-none focus:border-[#FCA5A5] focus:ring-2 focus:ring-red-100";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Send feedback"
        subtitle="Tell us what is working, what is broken, or what you wish existed."
      />

      <div className="mx-auto max-w-xl">
        <CardShell>
          <CardHeader bordered>
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-[#8E8E93]" />
              <h2 className="t-title text-[#111]">New message</h2>
            </div>
            <p className="mt-1 t-caption text-[#8E8E93]">
              All required fields are marked with an asterisk.
            </p>
          </CardHeader>

          <CardBody className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="topic" className="t-label font-medium text-[#111]">
                  Topic <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  id="topic"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FeedbackTopic)}
                  className={selectClass}
                >
                  {TOPIC_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="severity" className="t-label font-medium text-[#111]">
                  Severity <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  id="severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as FeedbackSeverity)}
                  className={selectClass}
                >
                  {SEVERITY_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="subject" className="t-label font-medium text-[#111]">
                Subject <span className="text-[#DC2626]">*</span>
              </label>
              <input
                id="subject"
                type="text"
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value);
                  setSummaryTouched(true);
                }}
                onBlur={() => setSummaryTouched(true)}
                placeholder="Brief description of the issue or idea"
                className={summaryError ? errorInputClass : inputClass}
                aria-invalid={summaryError != null}
                aria-describedby={summaryError ? "subject-error" : undefined}
              />
              {summaryError ? (
                <HelpText tone="error">{summaryError}</HelpText>
              ) : (
                <HelpText>At least 8 characters.</HelpText>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="message" className="t-label font-medium text-[#111]">
                Message
              </label>
              <textarea
                id="message"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={6}
                placeholder="Steps to reproduce, context, links, screenshots..."
                className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-2 t-label text-[#111] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="system-id" className="t-label font-medium text-[#111]">
                  System ID
                </label>
                <input
                  id="system-id"
                  type="text"
                  value={systemId}
                  onChange={(e) => setSystemId(e.target.value)}
                  placeholder="sys_abc123"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact-email" className="t-label font-medium text-[#111]">
                  Reply-to email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="you@company.com"
                  className={inputClass}
                />
              </div>
            </div>
          </CardBody>

          <CardFooter>
            <HelpText>We read every message.</HelpText>
            <Button
              variant="primary"
              isDisabled={submitting}
              onPress={handleSubmit}
              className="flex items-center gap-1.5"
            >
              {submitting ? <Spinner size="sm" /> : <Send size={14} />}
              Send feedback
            </Button>
          </CardFooter>
        </CardShell>
      </div>
    </div>
  );
}
