import type { AppContext, RepositorySet, SystemBundle, SystemRecord } from "@/lib/repositories/contracts";

export type PersonalizationPayload = {
  userFirstName: string;
  userTeam: string;
  priorSystemsSummary: string;
  systemName: string;
  existingNodesCount: number;
  existingPipesCount: number;
};

export type PersonalizationIdentity = {
  email?: string | null;
  name?: string | null;
};

const SUMMARY_MAX_LEN = 80;

export function deriveFirstName(identity: PersonalizationIdentity | null | undefined): string {
  if (!identity) return "";
  const name = (identity.name ?? "").trim();
  if (name) {
    const first = name.split(/\s+/)[0];
    if (first) return first;
  }
  const email = (identity.email ?? "").trim();
  if (email) {
    const local = email.split("@")[0] ?? "";
    if (local) return local;
  }
  return "";
}

export function summarizePriorSystems(systems: SystemRecord[], excludeSystemId: string): string {
  const others = systems
    .filter((s) => s.id !== excludeSystemId && !s.archivedAt)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, 3)
    .map((s) => s.name.trim())
    .filter((n) => n.length > 0);
  if (others.length === 0) return "";
  const summary = `Has shipped: ${others.join(", ")}`;
  if (summary.length <= SUMMARY_MAX_LEN) return summary;
  return `${summary.slice(0, SUMMARY_MAX_LEN - 1)}.`;
}

export async function buildPersonalizationPayload(
  ctx: AppContext,
  systemId: string,
  repos: RepositorySet,
  identity: PersonalizationIdentity | null | undefined
): Promise<PersonalizationPayload> {
  const userFirstName = deriveFirstName(identity);

  let userTeam = "";
  try {
    // The workspaces repo only exposes plan info; the workspace name lives on
    // the persisted record returned by systems.list (workspaceId) but is not
    // surfaced in the contract. Best we can do for v1 is empty + TODO.
    // TODO: surface workspace name through WorkspacesRepository when adding
    // multi-workspace UI in Phase 5.
    userTeam = "";
  } catch {
    userTeam = "";
  }

  let systems: SystemRecord[] = [];
  try {
    systems = await repos.systems.list(ctx.workspaceId);
  } catch {
    systems = [];
  }

  const currentSystem = systems.find((s) => s.id === systemId);
  const systemName = currentSystem?.name ?? "";
  const priorSystemsSummary = summarizePriorSystems(systems, systemId);

  let existingNodesCount = 0;
  let existingPipesCount = 0;
  try {
    const bundle: SystemBundle = await repos.systems.getBundle(systemId);
    existingNodesCount = bundle.nodes.length;
    existingPipesCount = bundle.pipes.length;
  } catch {
    existingNodesCount = 0;
    existingPipesCount = 0;
  }

  return {
    userFirstName,
    userTeam,
    priorSystemsSummary,
    systemName,
    existingNodesCount,
    existingPipesCount
  };
}
