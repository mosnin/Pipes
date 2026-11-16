"use client";

import { useId, useState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { apiErrorMessage } from "@/components/shell/api-error";

const CATEGORIES = [
  { value: "bug", label: "Bug" },
  { value: "ux", label: "UX" },
  { value: "feature_request", label: "Feature request" },
  { value: "reliability", label: "Reliability" },
  { value: "billing", label: "Billing" },
  { value: "other", label: "Other" }
];

export default function FeedbackSettingsPage() {
  const fieldId = useId();
  const [category, setCategory] = useState("bug");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [systemId, setSystemId] = useState("");
  const [status, setStatus] = useState("");
  const [failed, setFailed] = useState(false);

  const submit = async () => {
    const res = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ category, severity, summary, details, systemId: systemId || undefined, page: window.location.pathname }) });
    const body = await res.json();
    if (body.ok) {
      setSummary("");
      setDetails("");
      setSystemId("");
      setFailed(false);
      setStatus("Your feedback is in the triage queue.");
    } else {
      setFailed(true);
      setStatus(apiErrorMessage(body, "Your feedback did not send. Try again."));
    }
  };

  return (
    <SettingsShell title="Feedback" measure="prose" description="Report a bug or ask for something. It goes straight to the team's triage queue.">
      {status ? (
        <div aria-live="polite">
          <Banner role={failed ? "critical" : "positive"} title={failed ? "Feedback was not sent" : "Thanks"}>
            {status}
          </Banner>
        </div>
      ) : null}

      <Card>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid grid-cols-1 gap-7 p-6 sm:grid-cols-2">
            <Field label="Category" htmlFor={`${fieldId}-category`}>
              <Select id={`${fieldId}-category`} size="sm" value={category} onValueChange={setCategory} options={CATEGORIES} />
            </Field>
            <div className="flex flex-col gap-3">
              <span className="t-caption-medium text-ink">Severity</span>
              <Segmented
                label="Severity"
                size="sm"
                value={severity}
                onValueChange={setSeverity}
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" }
                ]}
                className="self-start"
              />
            </div>
            <Field label="Summary" htmlFor={`${fieldId}-summary`} hint="At least 8 characters." className="sm:col-span-2">
              <Input id={`${fieldId}-summary`} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What happened, in one line" />
            </Field>
            <Field label="Details" htmlFor={`${fieldId}-details`} className="sm:col-span-2">
              <Textarea id={`${fieldId}-details`} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Steps, what you expected, what you saw" />
            </Field>
            <Field label="Workflow id" htmlFor={`${fieldId}-system`} hint="Optional. The workflow this is about." className="sm:col-span-2">
              <Input id={`${fieldId}-system`} value={systemId} onChange={(e) => setSystemId(e.target.value)} placeholder="sys_..." />
            </Field>
          </div>
          <CardFooter inset className="justify-end">
            <Button type="submit" variant="primary" size="sm">
              Send feedback
            </Button>
          </CardFooter>
        </form>
      </Card>
    </SettingsShell>
  );
}
