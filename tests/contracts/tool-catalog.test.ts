import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";

const root = process.cwd();

type CatalogTool = { name: string; actions: string[] };
type SkillMapEntry = {
  skill: string;
  actions?: Record<string, string[]>;
  tools: { required: string[]; optional: string[]; forbidden: string[] };
};

const catalog = () =>
  JSON.parse(
    readFileSync(resolve(root, "contracts/mcp-tool-catalog.json"), "utf8"),
  ) as {
    server_contract_version: string;
    tools: CatalogTool[];
    error_codes: string[];
  };

const skillMap = () =>
  (parseYaml(
    readFileSync(resolve(root, "contracts/skill-tool-map.yaml"), "utf8"),
  ) as { skills: SkillMapEntry[] }).skills;

describe("MCP Tool Catalog compatibility", () => {
  it("contains each Tool used by a Skill and every declared action", () => {
    const { tools } = catalog();
    const byName = new Map(tools.map((tool) => [tool.name, tool]));

    for (const skill of skillMap()) {
      for (const name of [
        ...skill.tools.required,
        ...skill.tools.optional,
        ...skill.tools.forbidden,
      ])
        expect(byName.has(name), `${skill.skill} -> ${name}`).toBe(true);
      for (const [name, actions] of Object.entries(skill.actions ?? {})) {
        const known = new Set(byName.get(name)?.actions ?? []);
        for (const action of actions)
          expect(known.has(action), `${skill.skill} -> ${name}.${action}`).toBe(true);
      }
    }
  });

  it("contains the MCP error codes referenced by official Skills", () => {
    const known = new Set(catalog().error_codes);
    for (const skill of skillMap()) {
      const text = readFileSync(
        resolve(root, "shared/skills", skill.skill, "SKILL.md"),
        "utf8",
      );
      for (const code of new Set(text.match(/MCP_[A-Z_]+/g) ?? []))
        expect(known.has(code), `${skill.skill} -> ${code}`).toBe(true);
    }
  });

  it("tracks the current file and operation actions exposed by aixcut_frontend", () => {
    const frontend = catalog().tools.find((tool) => tool.name === "aixcut_frontend");
    expect(frontend?.actions).toEqual(expect.arrayContaining([
      "media.add",
      "media.analyze",
      "media.list",
      "media.save_to_disk",
      "operation.get",
      "operation.cancel",
      "operation.retry",
      "timeline.export_range",
    ]));
  });
});
