import { LOOPER_SCHEMA_VERSION } from "./schema";

export type VersionedDocument = {
  schemaVersion?: number;
  looper_schema_v1?: unknown;
  [key: string]: unknown;
};

type MigrationFn = (doc: Record<string, unknown>) => Record<string, unknown>;

const migrations: Map<number, MigrationFn> = new Map([
  // v0 → v1: add schemaVersion field; normalize node positions to {x,y} objects
  [1, (doc) => {
    const nodes = (doc.nodes as Array<Record<string, unknown>> | undefined) ?? [];
    return {
      ...doc,
      schemaVersion: 1,
      nodes: nodes.map((n) => ({
        ...n,
        position: n.position ?? { x: (n.x as number) ?? 0, y: (n.y as number) ?? 0 },
        config: n.config ?? {},
      })),
    };
  }],
  // v1 → v2 would go here: { 2, (doc) => ... }
]);

export function migrateDocument(doc: VersionedDocument): VersionedDocument {
  const fromVersion = (doc.schemaVersion as number | undefined) ?? 0;
  const toVersion = LOOPER_SCHEMA_VERSION;

  if (fromVersion >= toVersion) return doc;

  let current = { ...doc } as Record<string, unknown>;
  for (let v = fromVersion + 1; v <= toVersion; v++) {
    const migrationFn = migrations.get(v);
    if (migrationFn) {
      current = migrationFn(current);
    }
  }

  return current as VersionedDocument;
}

export function detectSchemaVersion(doc: unknown): number {
  if (typeof doc !== "object" || doc === null) return 0;
  const d = doc as Record<string, unknown>;
  if (typeof d.schemaVersion === "number") return d.schemaVersion;
  if ("looper_schema_v1" in d) return 1;
  // Legacy: documents exported with version string "pipes_schema_v1" map to v1
  if (d.version === "pipes_schema_v1") return 0;
  return 0;
}

/** Upgrade a pipes_schema_v1 export doc into a looper_schema_v1 shape */
export function upgradePipesDocument(doc: Record<string, unknown>): Record<string, unknown> {
  return {
    ...doc,
    version: "looper_schema_v1",
    // Subsystem nodes from pipes era: rename type to SubLoop
    nodes: ((doc.nodes as Array<Record<string, unknown>>) ?? []).map((n) =>
      n.type === "Subsystem" ? { ...n, type: "SubLoop" } : n
    ),
  };
}

export function needsMigration(doc: unknown): boolean {
  return detectSchemaVersion(doc) < LOOPER_SCHEMA_VERSION;
}
