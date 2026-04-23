import { PipesSchemaV1, type PipesSchemaDocument } from "./schema";

export function parsePipesSchema(input: unknown): PipesSchemaDocument {
  return PipesSchemaV1.parse(input);
}

export function serializePipesSchema(doc: PipesSchemaDocument): string {
  return JSON.stringify(doc, null, 2);
}
