import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { test } from "node:test";

const root = resolve(new URL("..", import.meta.url).pathname);
const hosts = ["codex", "openai"];

const walk = (directory) =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

for (const host of hosts) {
  const hostRoot = join(root, host);
  const skillsRoot = join(hostRoot, "skills");
  const catalog = readJson(join(hostRoot, "contracts/mcp-tool-catalog.json"));
  const tools = new Map(catalog.tools.map((tool) => [tool.name, new Set(tool.actions)]));
  const skillFiles = walk(skillsRoot).filter((path) => path.endsWith(".md"));
  const selector = { aixcut_open: "target", aixcut_read: "view", aixcut_review: "view" };

  test(`${host}: every referenced MCP tool exists in the live catalog`, () => {
    for (const file of skillFiles) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/\baixcut_[a-z_]+\b/g)) {
        assert.ok(tools.has(match[0]), `${relative(root, file)} uses unknown tool ${match[0]}`);
      }
    }
  });

  test(`${host}: every explicit action or selector exists`, () => {
    for (const file of skillFiles) {
      const source = readFileSync(file, "utf8");
      for (const [tool, allowed] of tools) {
        const field = selector[tool] ?? "action";
        const regex = new RegExp(`\\b${tool}\\(\\s*${field}="([^"]+)"`, "g");
        for (const match of source.matchAll(regex)) {
          assert.ok(allowed.has(match[1]), `${relative(root, file)} has invalid ${tool}.${field}=${match[1]}`);
        }
      }
    }
  });

  test(`${host}: examples have no empty argument slots`, () => {
    for (const file of skillFiles) {
      assert.doesNotMatch(readFileSync(file, "utf8"), /,\s*,/, relative(root, file));
    }
  });

  test(`${host}: music volume and extracted video audio are explicit`, () => {
    const timeline = readFileSync(join(skillsRoot, "aixcut-timeline-editing/SKILL.md"), "utf8");
    assert.match(timeline, /aixcut_audio\(action="update",[^)]*target[^)]*volume/i);
    assert.match(timeline, /aixcut_frontend\(action="media\.extract_audio"/);

    const assembly = [
      "aixcut-video-assembly/SKILL.md",
      "aixcut-video-assembly/references/pipeline.md",
    ]
      .map((file) => readFileSync(join(skillsRoot, file), "utf8"))
      .join("\n");
    assert.match(assembly, /aixcut_audio\(action="update",[^)]*target[^)]*volume/i);
  });
}
