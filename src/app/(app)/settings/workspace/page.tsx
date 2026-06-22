"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  CardShell,
  CardHeader,
  CardBody,
  Input,
  PageHeader,
  Spinner,
  SkeletonSettingsSection,
} from "@/components/ui";

interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  description?: string;
}

export default function WorkspaceSettingsPage() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    void fetch("/api/workspace")
      .then((r) => r.json())
      .then((res: { data: WorkspaceData }) => {
        setData(res.data);
        setName(res.data.name);
        setDescription(res.data.description ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const isDirty =
    name.trim() !== (data?.name ?? "") ||
    description.trim() !== (data?.description ?? "");

  async function handleSave() {
    if (!isDirty || !name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/workspace", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? "Save failed");
      }
      const updated = await res.json() as { data: WorkspaceData };
      setData(updated.data);
      toast.success("Workspace updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Workspace"
        subtitle="Manage your workspace name and details."
      />

      {loading ? (
        <CardShell>
          <CardBody>
            <SkeletonSettingsSection />
          </CardBody>
        </CardShell>
      ) : (
        <>
          <CardShell>
            <CardHeader bordered>Workspace details</CardHeader>
            <CardBody>
              <div className="flex flex-col gap-4 max-w-md">
                <div className="flex flex-col gap-1.5">
                  <label className="t-label font-medium text-[#111]" htmlFor="ws-name">
                    Name
                  </label>
                  <Input
                    id="ws-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Workspace"
                    maxLength={80}
                  />
                  <p className="t-caption text-[#8E8E93]">
                    Shown in the sidebar and shared with collaborators.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="t-label font-medium text-[#111]" htmlFor="ws-description">
                    Description <span className="font-normal text-[#8E8E93]">(optional)</span>
                  </label>
                  <Input
                    id="ws-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What this workspace is for..."
                    maxLength={280}
                  />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={() => void handleSave()}
                    isDisabled={saving || !isDirty || !name.trim()}
                  >
                    {saving ? <Spinner size="sm" /> : null}
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                  {isDirty && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => {
                        setName(data?.name ?? "");
                        setDescription(data?.description ?? "");
                      }}
                    >
                      Discard
                    </Button>
                  )}
                </div>
              </div>
            </CardBody>
          </CardShell>

          <CardShell>
            <CardHeader bordered>Workspace info</CardHeader>
            <CardBody>
              <dl className="flex flex-col divide-y divide-black/[0.06]">
                {[
                  { label: "Workspace ID", value: data?.id },
                  { label: "Slug", value: data?.slug },
                  { label: "Plan", value: data?.plan },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <dt className="t-label text-[#8E8E93]">{label}</dt>
                    <dd className="t-label font-medium text-[#111] font-mono text-right truncate max-w-[240px]">
                      {value ?? "-"}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </CardShell>
        </>
      )}
    </div>
  );
}
