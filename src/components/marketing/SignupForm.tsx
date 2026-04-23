"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input } from "@/components/ui";

export function SignupForm({ source }: { source: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const start = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "start", email, workspace })
      });
      const data = await start.json();
      if (!data.ok) {
        setError(data.error?.message ?? "Unable to start onboarding right now.");
        return;
      }
      router.push(`/onboarding?source=${encodeURIComponent(source)}`);
    } catch {
      setError("Unable to reach onboarding right now. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="signup-form-grid">
      <div>
        <p className="eyebrow">STEP 1</p>
        <h3>Identity</h3>
        <Input placeholder="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <p className="eyebrow">STEP 2</p>
        <h3>Workspace name</h3>
        <Input placeholder="Acme Platform Systems" value={workspace} onChange={(e) => setWorkspace(e.target.value)} />
      </div>
      <div className="signup-actions-row">
        <Button onClick={submit} disabled={submitting}>{submitting ? "Creating workspace…" : "Create workspace"}</Button>
        <p className="muted">Next: open your system library and create the first system.</p>
      </div>
      {error ? <p role="alert" className="status-error">{error}</p> : null}
      <p className="muted">Already have access? <Link href="/login">Log in</Link>.</p>
    </div>
  );
}
