"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { PageShell } from "@/components/layouts/archetypes";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/components/shell/api-error";
import { useBillingStatus } from "@/components/shell/use-billing-status";
import { Card } from "@/components/ui/card";
import { GroupedList, GroupedRow } from "@/components/ui/grouped-list";
import { Field } from "@/components/ui/input";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type Recommendation = { id: string; title: string; description: string; category: string; useCase: string; complexity: string };
type Path = "blank" | "template" | "ai" | "import";

const ROLES = [
  { value: "builder", label: "Building agents" },
  { value: "engineering", label: "Engineering" },
  { value: "product", label: "Product" },
  { value: "ops", label: "Operations" },
  { value: "support", label: "Support" },
  { value: "sales", label: "Sales" }
];

const USE_CASES = [
  { value: "support", label: "Customer support" },
  { value: "research", label: "Research" },
  { value: "automation", label: "Automating a process" },
  { value: "coding", label: "Coding workflows" },
  { value: "sales", label: "Sales and outreach" }
];

async function postJson(url: string, body: unknown) {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return await res.json().catch(() => ({ ok: false }));
  } catch {
    return { ok: false, message: "Pipes could not be reached. Check your connection and try again." };
  }
}

export function OnboardingClient(): ReactNode {
  const router = useRouter();
  const [role, setRole] = useState("builder");
  const [useCase, setUseCase] = useState("support");
  const [recommended, setRecommended] = useState<Recommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [busy, setBusy] = useState<Path | null>(null);
  const [error, setError] = useState<string | null>(null);
  const billing = useBillingStatus();
  const aiAllowed = billing ? billing.entitlements.aiGeneration : true;
  const fail = (data: unknown, fallback: string) => {
    setError(apiErrorMessage(data, fallback));
    setBusy(null);
  };

  useEffect(() => {
    void postJson("/api/onboarding", { action: "start" });
  }, []);
  useEffect(() => {
    setLoadingRecommendations(true);
    postJson("/api/onboarding", { action: "recommend", role, useCase })
      .then((d) => setRecommended(d.data?.recommendedTemplates ?? []))
      .finally(() => setLoadingRecommendations(false));
  }, [role, useCase]);

  const complete = (chosenPath: Path) => postJson("/api/onboarding", { action: "complete", chosenPath, role, useCase });

  const startBlank = async () => {
    setBusy("blank");
    setError(null);
    await complete("blank");
    const data = await postJson("/api/systems", { name: "Untitled workflow" });
    if (data.ok) router.push(`/systems/${data.data.systemId}`);
    else fail(data, "The workflow could not be created.");
  };
  const startAi = async () => {
    setBusy("ai");
    setError(null);
    await complete("ai");
    const roleLabel = ROLES.find((r) => r.value === role)?.label ?? role;
    const caseLabel = USE_CASES.find((c) => c.value === useCase)?.label ?? useCase;
    const draft = await postJson("/api/ai/generate-system", { prompt: `Build a ${caseLabel.toLowerCase()} workflow for a team focused on ${roleLabel.toLowerCase()}` });
    if (!draft.ok) return fail(draft, "The draft could not be generated.");
    const commit = await postJson("/api/ai/generate-system", { commit: true, draft: draft.data });
    if (commit.ok) router.push(`/systems/${commit.data.systemId}`);
    else fail(commit, "The draft could not be saved.");
  };
  const startImport = async () => {
    setBusy("import");
    await complete("import");
    router.push("/dashboard");
  };
  const startTemplate = async (templateId: string) => {
    setBusy("template");
    setError(null);
    await complete("template");
    const data = await postJson(`/api/templates/${templateId}/instantiate`, {});
    if (data.ok) router.push(`/systems/${data.data.systemId}`);
    else fail(data, "That template could not be opened.");
  };

  return (
    <PageShell measure="page">
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-7">
        <PageHeader title="Get started" description="Tell us what you are building and pick a way in. You can change everything later." />

        <section aria-labelledby="about-heading" className="flex flex-col gap-4">
          <SectionHeading>
            <span id="about-heading">About your work</span>
          </SectionHeading>
          <Card padded className="grid gap-5 sm:grid-cols-2">
            <Field label="What do you do?" htmlFor="onboarding-role">
              <Select id="onboarding-role" value={role} onValueChange={setRole} options={ROLES} />
            </Field>
            <Field label="What will your first workflow handle?" htmlFor="onboarding-use-case">
              <Select id="onboarding-use-case" value={useCase} onValueChange={setUseCase} options={USE_CASES} />
            </Field>
          </Card>
        </section>

        <section aria-labelledby="start-heading" className="flex flex-col gap-4">
          <SectionHeading>
            <span id="start-heading">Choose how to start</span>
          </SectionHeading>
          {error ? (
            <div role="alert">
              <Banner role="critical" title="That didn't start">
                {error}
              </Banner>
            </div>
          ) : null}
          <GroupedList>
            <GroupedRow title="Start blank" subtitle="An empty canvas. Add steps, tools and approvals yourself." trailing={busy === "blank" ? <span className="t-caption text-ink-3">Opening</span> : undefined} onClick={busy ? undefined : startBlank} />
            {aiAllowed ? (
              <GroupedRow title="Draft with AI" subtitle="Pipes drafts a first version from your answers above for you to edit." trailing={busy === "ai" ? <span className="t-caption text-ink-3">Drafting</span> : undefined} onClick={busy ? undefined : startAi} />
            ) : (
              <GroupedRow
                title="Draft with AI"
                subtitle="On the Builder plan. Pipes drafts a first version from your answers above for you to edit."
                trailing={
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/settings/billing">Upgrade</Link>
                  </Button>
                }
              />
            )}
            <GroupedRow title="Import a schema" subtitle="Bring a pipes_schema_v1 document from another workspace or an agent." onClick={busy ? undefined : startImport} />
          </GroupedList>
        </section>

        <section aria-labelledby="templates-heading" className="flex flex-col gap-4">
          <SectionHeading>
            <span id="templates-heading">Or begin from a template</span>
          </SectionHeading>
          {loadingRecommendations ? (
            <Skeleton className="h-[168px] w-full rounded-12" />
          ) : (
            <GroupedList empty="No recommendations for this combination yet. Start blank or draft with AI instead.">
              {recommended.map((template) => (
                <GroupedRow
                  key={template.id}
                  title={template.title}
                  subtitle={template.description || `${template.category} · ${template.complexity}`}
                  trailing={
                    <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => startTemplate(template.id)}>
                      Use template
                    </Button>
                  }
                />
              ))}
            </GroupedList>
          )}
        </section>
      </div>
    </PageShell>
  );
}
