import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * The in-app skills catalog: procedures written for agents that work inside
 * Pipes, one folder per skill with a SKILL.md, in the layout gstack uses
 * (YAML frontmatter, then the procedure). Served over MCP as prompts and
 * through the list_skills and get_skill tools. See docs/skills.md.
 */

export type Skill = {
  name: string;
  version: string;
  description: string;
  triggers: string[];
  tools: string[];
  capabilities: string[];
  /** The procedure, without the frontmatter. */
  body: string;
};

export const SKILLS_DIR = path.join(process.cwd(), "src", "skills");

/** Parses the small YAML subset the catalog uses: `key: value` and `key:` followed by `  - item` lines. */
export function parseSkill(source: string): Skill {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(source.replace(/\r\n/g, "\n"));
  if (!match) throw new Error("A SKILL.md must start with a --- frontmatter block.");
  const fields: Record<string, string | string[]> = {};
  let list: string[] | null = null;
  for (const line of match[1].split("\n")) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && list) {
      list.push(item[1].trim());
      continue;
    }
    const kv = /^([a-z][a-z-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    if (kv[2] === "") {
      list = [];
      fields[kv[1]] = list;
    } else {
      list = null;
      fields[kv[1]] = kv[2].trim();
    }
  }
  const text = (k: string) => (typeof fields[k] === "string" ? (fields[k] as string) : "");
  const items = (k: string) => (Array.isArray(fields[k]) ? (fields[k] as string[]) : []);
  const skill = { name: text("name"), version: text("version") || "1.0.0", description: text("description"), triggers: items("triggers"), tools: items("tools"), capabilities: items("capabilities"), body: match[2].trim() };
  if (!/^[a-z0-9-]+$/.test(skill.name)) throw new Error(`Skill name "${skill.name}" must be lowercase words joined by hyphens.`);
  if (!skill.description) throw new Error(`Skill ${skill.name} needs a description.`);
  return skill;
}

let cache: Skill[] | null = null;

/** Every skill, sorted in the order an agent tends to need them (the catalog's own order file wins when present). */
export function listSkills(dir = SKILLS_DIR): Skill[] {
  if (cache && dir === SKILLS_DIR) return cache;
  const names = readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const skills = names.map((name) => {
    const skill = parseSkill(readFileSync(path.join(dir, name, "SKILL.md"), "utf8"));
    if (skill.name !== name) throw new Error(`Skill folder ${name} holds a skill named ${skill.name}.`);
    return skill;
  });
  const order = ORDER;
  skills.sort((a, b) => (order.indexOf(a.name) + 1 || 999) - (order.indexOf(b.name) + 1 || 999) || a.name.localeCompare(b.name));
  if (dir === SKILLS_DIR) cache = skills;
  return skills;
}

export function getSkill(name: string): Skill | null {
  return listSkills().find((s) => s.name === name) ?? null;
}

/** Performing first, then recovering, then reviewing and designing. */
const ORDER = [
  "walk-a-run",
  "report-a-step",
  "choose-a-route",
  "stay-inside-the-rails",
  "remember-what-matters",
  "wait-for-approval",
  "recover-from-a-refusal",
  "resume-after-a-disconnect",
  "hand-off-a-run",
  "debug-a-failed-run",
  "review-a-run",
  "design-a-workflow",
  "write-step-instructions"
];

/** The skill as one markdown document, frontmatter summarised, for prompts and get_skill. */
export function renderSkill(skill: Skill): string {
  return `${skill.body}\n\n---\nTools: ${skill.tools.join(", ") || "none"}. Capabilities: ${skill.capabilities.join(", ") || "none"}.`;
}
