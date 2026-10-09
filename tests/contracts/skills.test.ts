import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const skillsRoot = resolve(root, "shared/skills");
const sharedRoot = resolve(root, "shared");
const mapPath = resolve(root, "contracts/skill-tool-map.yaml");

type SkillMapEntry = {
  skill: string;
  surfaces: string[];
  requires: string[];
  helper: string | null;
  tools: { required: string[]; optional: string[]; forbidden: string[] };
  references: string[];
};

const skillNames = () =>
  readdirSync(skillsRoot)
    .filter((entry) => statSync(join(skillsRoot, entry)).isDirectory())
    .sort();

const skillMap = (): SkillMapEntry[] =>
  (parseYaml(readFileSync(mapPath, "utf8")) as { skills: SkillMapEntry[] })
    .skills;

const skillText = (name: string) =>
  readFileSync(join(skillsRoot, name, "SKILL.md"), "utf8");

const skillFrontmatter = (name: string) => {
  const text = skillText(name);
  expect(text.startsWith("---\n")).toBe(true);
  const end = text.indexOf("\n---", 4);
  expect(end).toBeGreaterThan(0);
  return parseYaml(text.slice(4, end)) as Record<string, unknown>;
};

describe("shared AIXCut Skills", () => {
  it("has exactly one mapping entry for every shared Skill", () => {
    expect(skillMap().map(({ skill }) => skill).sort()).toEqual(skillNames());
  });

  it("has valid name and description frontmatter for every Skill", () => {
    for (const name of skillNames()) {
      const frontmatter = skillFrontmatter(name);
      expect(Object.keys(frontmatter).sort()).toEqual(["description", "name"]);
      expect(frontmatter.name).toBe(name);
      expect(String(frontmatter.description).length).toBeGreaterThan(20);
    }
  });

  it("declares every referenced Tool and keeps forbidden Tools uncallable", () => {
    for (const entry of skillMap()) {
      const callable = new Set([
        ...entry.tools.required,
        ...entry.tools.optional,
      ]);
      const declared = new Set([...callable, ...entry.tools.forbidden]);
      for (const tool of new Set(skillText(entry.skill).match(/aixcut_[a-z_]+/g) ?? []))
        expect(`${entry.skill}:${tool}`).toBe(
          `${entry.skill}:${declared.has(tool) ? tool : "UNDECLARED"}`,
        );
      for (const tool of entry.tools.forbidden) expect(callable.has(tool)).toBe(false);
    }
  });

  it("resolves each declared reference and helper inside the shared package", () => {
    for (const entry of skillMap()) {
      for (const reference of entry.references)
        expect(
          existsSync(join(skillsRoot, entry.skill, reference)),
          `${entry.skill} reference ${reference}`,
        ).toBe(true);
      if (entry.helper)
        expect(existsSync(join(sharedRoot, entry.helper)), entry.helper).toBe(true);
    }
  });

  it("does not pin a website MCP endpoint or host-private tool namespace", () => {
    for (const name of skillNames()) {
      const contents = skillText(name).toLowerCase();
      expect(contents).not.toContain("mcp__");
      expect(contents).not.toContain("localhost");
      expect(contents).not.toContain("aixcut.cn");
      expect(contents).not.toContain("https://aixcut.com/mcp");
    }
  });
});
