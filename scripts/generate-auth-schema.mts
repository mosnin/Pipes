/**
 * Writes convex/betterAuth/schema.ts from Pipes' Better Auth config
 * (src/lib/auth/schema-options.ts), so the Convex component's tables always
 * match the plugins and extra fields Pipes uses. Run after changing either:
 *
 *   npx tsx scripts/generate-auth-schema.mts
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { getAuthTables } from "@better-auth/core/db";
// Not in the package's public exports; it is what the Better Auth CLI calls through the Convex adapter.
import { createSchema } from "../node_modules/@convex-dev/better-auth/dist/client/create-schema.js";
import { authSchemaOptions } from "../src/lib/auth/schema-options";

const file = path.join(process.cwd(), "convex", "betterAuth", "schema.ts");
const { code } = await createSchema({ tables: getAuthTables(authSchemaOptions as never), file });

/**
 * createSchema adds a fixed set of indexes per table, including some on
 * fields Pipes' tables do not have (a legacy `user.userId`). Convex refuses
 * those, so drop any index whose fields are not in its table.
 */
function dropDanglingIndexes(source: string): string {
  return source.replace(/(\w+): defineTable\(\{([\s\S]*?)\}\)((?:\s*\.index\([^)]*\))*)/g, (whole, table: string, body: string, indexes: string) => {
    const fields = new Set([...body.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]));
    const kept = [...indexes.matchAll(/\.index\("([^"]+)",\s*\[([^\]]*)\]\)/g)].filter((m) => m[2].split(",").map((f) => f.trim().replace(/"/g, "")).every((f) => fields.has(f)));
    return `${table}: defineTable({${body}})${kept.map((m) => `\n    ${m[0]}`).join("")}`;
  });
}

/**
 * Indexes Better Auth 1.7's queries need that createSchema does not add:
 * clearing stale two-step challenges filters on identifier and createdAt.
 */
const EXTRA_INDEXES: Record<string, string[][]> = { verification: [["identifier", "createdAt"]] };

function addIndexes(source: string): string {
  let out = source;
  for (const [table, indexes] of Object.entries(EXTRA_INDEXES)) {
    out = out.replace(new RegExp(`(${table}: defineTable\\(\\{[\\s\\S]*?\\}\\)(?:\\s*\\.index\\([^)]*\\))*)`), (block) =>
      indexes.reduce((acc, fields) => (acc.includes(`"${fields.join("_")}"`) ? acc : `${acc}\n    .index("${fields.join("_")}", [${fields.map((f) => `"${f}"`).join(",")}])`), block)
    );
  }
  return out;
}

writeFileSync(file, addIndexes(dropDanglingIndexes(code)).replace(/npx auth generate --output \S+/, "npx tsx scripts/generate-auth-schema.mts"));
console.log(`Wrote ${path.relative(process.cwd(), file)}`);
