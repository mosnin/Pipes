"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, PageHeader } from "@/components/ui";

export function OnboardingClient() {
  const router = useRouter();
  const [role, setRole] = useState("builder");
  const [useCase, setUseCase] = useState("support");
  const [recommended, setRecommended] = useState<Array<{ id: string; title: string; description: string; category: string; useCase: string; complexity: string }>>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);

  useEffect(() => { void fetch("/api/onboarding", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "start" }) }); }, []);
  useEffect(() => {
    setLoadingRecommendations(true);
    fetch("/api/onboarding", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "recommend", role, useCase }) })
      .then((r) => r.json())
      .then((d) => setRecommended(d.data?.recommendedTemplates ?? []))
      .finally(() => setLoadingRecommendations(false));
  }, [role, useCase]);

  const complete = async (chosenPath: "blank" | "template" | "ai" | "import") => {
    await fetch("/api/onboarding", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "complete", chosenPath, role, useCase }) });
  };

  return (
    <div>
      <PageHeader title="Get to first value" subtitle="Pick a path, start quickly, and iterate in the editor." />
      <Card>
        <h3>Context (short)</h3>
        <div className="nav-inline">
          <Input aria-label="Your role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (e.g. ops, product, engineering)" />
          <Input aria-label="Primary use case" value={useCase} onChange={(e) => setUseCase(e.target.value)} placeholder="Use case (e.g. support, research, automation)" />
        </div>
      </Card>
      <div className="grid-2">
        <Card><h3>Blank system</h3><p>Start from first principles.</p><Button onClick={async () => {
          await complete("blank");
          const res = await fetch("/api/systems", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Untitled System" }) });
          const data = await res.json();
          if (data.ok) router.push(`/systems/${data.data.systemId}`);
        }}>Start blank</Button></Card>
        <Card><h3>AI generated</h3><p>Fast first artifact via AI boundary.</p><Button onClick={async () => {
          await complete("ai");
          const draftRes = await fetch("/api/ai/generate-system", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: `Build a ${useCase} ${role} system` }) });
          const draft = await draftRes.json();
          if (!draft.ok) return;
          const commitRes = await fetch("/api/ai/generate-system", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ commit: true, draft: draft.data }) });
          const commit = await commitRes.json();
          if (commit.ok) router.push(`/systems/${commit.data.systemId}`);
        }}>Generate + commit</Button></Card>
        <Card><h3>Import schema</h3><p>Bring existing design into Pipes.</p><Button onClick={async () => { await complete("import"); router.push("/dashboard"); }}>Go to import on dashboard</Button></Card>
        <Card><h3>Template</h3><p>Use a proven starting shape.</p>
          {loadingRecommendations ? <p aria-live="polite">Loading recommendations…</p> : recommended.length === 0 ? <p>Recommendations unavailable. You can still start from blank or AI.</p> : recommended.map((t) => <div key={t.id} className="nav-inline" style={{ justifyContent: "space-between" }}><span>{t.title} · {t.category} · {t.complexity}</span><Button onClick={async () => {
            await complete("template");
            const res = await fetch(`/api/templates/${t.id}/instantiate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
            const data = await res.json();
            if (data.ok) router.push(`/systems/${data.data.systemId}`);
          }}>Launch</Button></div>)}
        </Card>
      </div>
    </div>
  );
}
