import { describe, expect, it } from "vitest";
import { MCP_TOOLS } from "@/lib/mcp/tools";
import { AGENT_CAPABILITIES } from "@/lib/protocol/capabilities";
import { getSkill, listSkills, parseSkill, renderSkill } from "@/lib/skills/catalog";

describe("skills catalog", () => {
  const skills = listSkills();
  const tools = new Set(MCP_TOOLS.map((t) => t.name));
  const capabilities = new Set<string>(AGENT_CAPABILITIES);

  it("loads every skill, starting with walk-a-run", () => {
    expect(skills.length).toBeGreaterThanOrEqual(13);
    expect(skills[0].name).toBe("walk-a-run");
    expect(new Set(skills.map((s) => s.name)).size).toBe(skills.length);
  });

  it("names only tools and capabilities that exist", () => {
    for (const s of skills) {
      for (const t of s.tools) expect(tools.has(t), `${s.name} names unknown tool ${t}`).toBe(true);
      for (const c of s.capabilities) expect(capabilities.has(c), `${s.name} names unknown capability ${c}`).toBe(true);
    }
  });

  it("has the sections every skill needs, and follows the copy rules", () => {
    for (const s of skills) {
      expect(s.description.length, s.name).toBeLessThan(160);
      expect(s.triggers.length, s.name).toBeGreaterThan(0);
      expect(s.body, s.name).toMatch(/^# /);
      expect(s.body, s.name).toContain("## When to use");
      expect(s.body, s.name).toContain("## Done when");
      expect(s.body, `${s.name} has an em dash`).not.toContain("—");
    }
  });

  it("mentions only skills that exist when it points to another", () => {
    const names = new Set(skills.map((s) => s.name));
    for (const s of skills) {
      for (const [, ref] of s.body.matchAll(/the ([a-z]+(?:-[a-z]+)+) skill/g)) expect(names.has(ref), `${s.name} points to ${ref}`).toBe(true);
    }
  });

  it("renders a skill with its tools, and refuses a malformed file", () => {
    expect(renderSkill(getSkill("walk-a-run")!)).toContain("Tools: list_workflows");
    expect(getSkill("nope")).toBeNull();
    expect(() => parseSkill("# no frontmatter")).toThrow();
    expect(() => parseSkill("---\nname: Bad Name\ndescription: x\n---\nbody")).toThrow();
  });
});
