import type { OutputSchema } from "@/domain/rails/types";

/**
 * Check a step's output against its contract. Returns readable problems with
 * a path ("output.amount: expected a number"), empty when the output fits.
 * A deliberate subset of JSON Schema, so Pipes needs no validator dependency.
 */
export function validateOutput(schema: OutputSchema, value: unknown, path = "output"): string[] {
  const problems: string[] = [];
  const kind = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;

  switch (schema.type) {
    case "object": {
      if (kind !== "object") return [`${path}: expected an object, got ${kind}`];
      const record = value as Record<string, unknown>;
      for (const key of schema.required ?? []) {
        if (record[key] === undefined) problems.push(`${path}.${key}: required`);
      }
      for (const [key, child] of Object.entries(schema.properties ?? {})) {
        if (record[key] !== undefined) problems.push(...validateOutput(child, record[key], `${path}.${key}`));
      }
      if (schema.additionalProperties === false) {
        const known = new Set(Object.keys(schema.properties ?? {}));
        for (const key of Object.keys(record)) if (!known.has(key)) problems.push(`${path}.${key}: not allowed`);
      }
      return problems;
    }
    case "array": {
      if (kind !== "array") return [`${path}: expected a list, got ${kind}`];
      const list = value as unknown[];
      if (schema.minItems !== undefined && list.length < schema.minItems) problems.push(`${path}: needs at least ${schema.minItems} items`);
      if (schema.maxItems !== undefined && list.length > schema.maxItems) problems.push(`${path}: allows at most ${schema.maxItems} items`);
      if (schema.items) list.forEach((item, i) => problems.push(...validateOutput(schema.items!, item, `${path}[${i}]`)));
      return problems;
    }
    case "string": {
      if (kind !== "string") return [`${path}: expected text, got ${kind}`];
      const text = value as string;
      if (schema.enum && !schema.enum.includes(text)) problems.push(`${path}: must be one of ${schema.enum.join(", ")}`);
      if (schema.minLength !== undefined && text.length < schema.minLength) problems.push(`${path}: needs at least ${schema.minLength} characters`);
      if (schema.maxLength !== undefined && text.length > schema.maxLength) problems.push(`${path}: allows at most ${schema.maxLength} characters`);
      if (schema.pattern) {
        try {
          if (!new RegExp(schema.pattern).test(text)) problems.push(`${path}: does not match ${schema.pattern}`);
        } catch {
          // A broken pattern in the contract is the designer's problem, not the agent's.
        }
      }
      return problems;
    }
    case "number":
    case "integer": {
      if (kind !== "number" || !Number.isFinite(value)) return [`${path}: expected a number, got ${kind}`];
      const n = value as number;
      if (schema.type === "integer" && !Number.isInteger(n)) problems.push(`${path}: expected a whole number`);
      if (schema.minimum !== undefined && n < schema.minimum) problems.push(`${path}: must be at least ${schema.minimum}`);
      if (schema.maximum !== undefined && n > schema.maximum) problems.push(`${path}: must be at most ${schema.maximum}`);
      return problems;
    }
    case "boolean":
      return kind === "boolean" ? [] : [`${path}: expected true or false, got ${kind}`];
  }
}

const TYPES = new Set(["object", "array", "string", "number", "integer", "boolean"]);

/** Keep only the parts of a schema Pipes understands; drop anything malformed. */
export function sanitizeSchema(input: unknown, depth = 0): OutputSchema | undefined {
  if (!input || typeof input !== "object" || depth > 6) return undefined;
  const raw = input as Record<string, unknown>;
  const type = String(raw.type ?? "");
  if (!TYPES.has(type)) return undefined;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  switch (type) {
    case "object": {
      const properties: Record<string, OutputSchema> = {};
      if (raw.properties && typeof raw.properties === "object") {
        for (const [key, child] of Object.entries(raw.properties as Record<string, unknown>).slice(0, 50)) {
          const clean = sanitizeSchema(child, depth + 1);
          if (clean) properties[key.slice(0, 80)] = clean;
        }
      }
      const required = Array.isArray(raw.required) ? raw.required.map(String).slice(0, 50) : undefined;
      return { type: "object", properties, required, additionalProperties: raw.additionalProperties === false ? false : undefined };
    }
    case "array":
      return { type: "array", items: sanitizeSchema(raw.items, depth + 1), minItems: num(raw.minItems), maxItems: num(raw.maxItems) };
    case "string":
      return {
        type: "string",
        enum: Array.isArray(raw.enum) ? raw.enum.map(String).slice(0, 50) : undefined,
        minLength: num(raw.minLength),
        maxLength: num(raw.maxLength),
        pattern: typeof raw.pattern === "string" ? raw.pattern.slice(0, 200) : undefined
      };
    case "number":
    case "integer":
      return { type, minimum: num(raw.minimum), maximum: num(raw.maximum) };
    default:
      return { type: "boolean" };
  }
}

function posInt(value: unknown, max: number): number | undefined {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, max) : undefined;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Keep only valid workflow rails. Undefined when nothing is set. */
export function sanitizeWorkflowRails(input: unknown): import("@/domain/rails/types").WorkflowRails | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as Record<string, any>;
  const budgets = {
    maxSteps: posInt(raw.budgets?.maxSteps, 10_000),
    maxDurationMs: posInt(raw.budgets?.maxDurationMs, 90 * DAY_MS),
    maxCostMicros: posInt(raw.budgets?.maxCostMicros, 1_000_000_000_000)
  };
  const concurrency = { maxActiveRuns: posInt(raw.concurrency?.maxActiveRuns, 10_000) };
  const value = {
    budgets: Object.values(budgets).some((v) => v !== undefined) ? budgets : undefined,
    concurrency: concurrency.maxActiveRuns !== undefined ? concurrency : undefined
  };
  return value.budgets || value.concurrency ? value : undefined;
}

/** Keep only valid step rails. Undefined when nothing is set. */
export function sanitizeStepRails(input: unknown): import("@/domain/rails/types").StepRails | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as Record<string, any>;
  const outcomes = Array.isArray(raw.allowedOutcomes) ? raw.allowedOutcomes.map((o: unknown) => String(o).trim().slice(0, 80)).filter(Boolean).slice(0, 25) : [];
  const schema = raw.output ? sanitizeSchema(raw.output.schema) : undefined;
  const value = {
    timeoutMs: posInt(raw.timeoutMs, 30 * DAY_MS),
    onTimeout: raw.onTimeout === "fail_run" ? ("fail_run" as const) : raw.timeoutMs ? ("failure_route" as const) : undefined,
    allowedOutcomes: outcomes.length ? outcomes : undefined,
    output: schema ? { schema, onInvalid: raw.output.onInvalid === "failure_route" ? ("failure_route" as const) : ("reject" as const) } : undefined,
    maxCostMicros: posInt(raw.maxCostMicros, 1_000_000_000_000)
  };
  return Object.values(value).some((v) => v !== undefined) ? value : undefined;
}
