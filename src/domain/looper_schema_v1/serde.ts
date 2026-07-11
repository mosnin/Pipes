import { LooperSchemaV1, type LooperSchemaDocument } from "./schema";

export function parseLooperSchema(input: unknown): LooperSchemaDocument {
  return LooperSchemaV1.parse(input);
}

export function serializeLooperSchema(doc: LooperSchemaDocument): string {
  return JSON.stringify(doc, null, 2);
}
