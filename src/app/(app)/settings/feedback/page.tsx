"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Card,
  Spinner,
  TextArea,
} from "@heroui/react";
import { MessageSquare, Send } from "lucide-react";

export default function FeedbackSettingsPage() {
  const [category, setCategory] = useState("bug");
  const [severity, setSeverity] = useState("medium");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [systemId, setSystemId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [summaryTouched, setSummaryTouched] = useState(false);

  const summaryError = summaryTouched && summary.trim().length < 8
    ? `${Math.max(0, 8 - summary.trim().length)} more character${8 - summary.trim().length === 1 ? "" : "s"} needed`
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
          page: window.location.pathname,
        }),
      });
      const body = await res.json();
      if (body.ok) {
        setSummary("");
        setDetails("");
        setSystemId("");
        toast.success("Feedback submitted — thank you!");
      } else {
        toast.error(body.error ?? "Failed to submit feedback.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="text-default-400" size={22} strokeWidth={1.5} />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Submit Feedback</h1>
          <p className="text-sm text-default-500 mt-0.5">Help us improve Pipes</p>
        </div>
      </div>

      {/* Feedback Form */}
      <Card>
        <Card.Header className="pb-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">Feedback Form</h2>
            <p className="text-xs text-default-400 mt-0.5">
              All fields marked * are required
            </p>
          </div>
        </Card.Header>
        <Card.Content className="gap-4">
          {/* Category + Severity row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground" htmlFor="category">
                Category <span className="text-danger">*</span>
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-default-200 bg-default-100 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="bug">Bug</option>
                <option value="ux">UX</option>
                <option value="feature_request">Feature Request</option>
                <option value="reliability">Reliability</option>
                <option value="billing">Billing</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground" htmlFor="severity">
                Severity <span className="text-danger">*</span>
              </label>
              <select
                id="severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full rounded-lg border border-default-200 bg-default-100 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {/* Summary */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-default-600">Summary <span className="text-danger">*</span></label>
            <input
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${summaryError ? "border-danger bg-danger-50 focus:ring-danger-200" : "border-default-200 bg-white focus:ring-indigo-500"}`}
              placeholder="Brief description of the issue or request"
              value={summary}
              onChange={(e) => { setSummary(e.target.value); setSummaryTouched(true); }}
              onBlur={() => setSummaryTouched(true)}
            />
            {summaryError && (
              <p className="text-xs text-danger mt-0.5">{summaryError}</p>
            )}
          </div>

          {/* Details */}
          <TextArea
            placeholder="Additional context, steps to reproduce, or suggestions…"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-default-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />

          {/* System ID */}
          <div>
            <label className="text-xs text-default-600">System ID</label>
            <input
              className="w-full rounded-lg border border-default-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="sys_abc123"
              value={systemId}
              onChange={(e) => setSystemId(e.target.value)}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-1">
            <Button
              variant="primary"
              onPress={handleSubmit}
              isDisabled={submitting}
            >
              {submitting ? (
                <Spinner size="sm" />
              ) : (
                <span className="flex items-center gap-1.5">
                  Submit Feedback
                  <Send size={15} strokeWidth={1.75} />
                </span>
              )}
            </Button>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
