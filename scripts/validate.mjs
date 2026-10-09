#!/usr/bin/env node
import { access, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootFlag = process.argv.indexOf("--root");
const root = resolve(rootFlag >= 0 ? process.argv[rootFlag + 1] ?? scriptRoot : scriptRoot);
const readJson = async (path) => JSON.parse(await readFile(join(root, path), "utf8"));
const requirePath = async (path, label = path) => {
  try {
    await access(join(root, path));
  } catch {
    throw new Error(`Missing ${label}: ${path}`);
  }
};
const treeHash = async (directory) => {
  const hash = createHash("sha256");
  const visit = async (current) => {
    for (const entry of (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else {
        hash.update(path.slice(directory.length));
        hash.update(await readFile(path));
      }
    }
  };
  await visit(directory);
  return hash.digest("hex");
};

const marketplace = await readJson(".agents/plugins/marketplace.json");
if (marketplace.plugins?.length !== 1 || marketplace.plugins[0].source?.path !== "./codex") {
  throw new Error("Marketplace must point to the Codex plugin at ./codex.");
}
const plugin = await readJson("codex/.codex-plugin/plugin.json");
if (plugin.name !== "aixcut-codex-plugin" || plugin.skills !== "./skills/") {
  throw new Error("Codex plugin manifest has an unexpected name or Skills path.");
}
const compatibility = await readJson("contracts/compatibility.json");
const catalog = await readJson("contracts/mcp-tool-catalog.json");
if (compatibility.plugin_version !== plugin.version) {
  throw new Error("Plugin version does not match compatibility metadata.");
}
if (
  compatibility.server_contract.min !== catalog.server_contract_version ||
  compatibility.server_contract.max !== catalog.server_contract_version
) {
  throw new Error("Server contract range does not match the bundled Tool Catalog.");
}
const catalogTools = new Map(catalog.tools.map((tool) => [tool.name, new Set(tool.actions)]));
const mapping = parseYaml(await readFile(join(root, "contracts/skill-tool-map.yaml"), "utf8"));
const skillRoot = join(root, "shared/skills");
const skillNames = (await readdir(skillRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const mappedNames = mapping.skills.map((entry) => entry.skill).sort();
if (JSON.stringify(skillNames) !== JSON.stringify(mappedNames)) {
  throw new Error("Shared Skills and skill-tool-map.yaml entries do not match.");
}
for (const entry of mapping.skills) {
  const skillText = await readFile(join(skillRoot, entry.skill, "SKILL.md"), "utf8");
  const match = skillText.match(/^---\n([\s\S]*?)\n---/);
  if (!match) throw new Error(`${entry.skill} is missing YAML frontmatter.`);
  const frontmatter = parseYaml(match[1]);
  if (frontmatter.name !== entry.skill || String(frontmatter.description ?? "").length < 20) {
    throw new Error(`${entry.skill} has invalid name/description frontmatter.`);
  }
  for (const reference of entry.references ?? []) {
    await requirePath(`shared/skills/${entry.skill}/${reference}`, `${entry.skill} reference`);
  }
  if (entry.helper) await requirePath(`shared/${entry.helper}`, `${entry.skill} helper`);
  for (const tool of [...(entry.tools.required ?? []), ...(entry.tools.optional ?? [])]) {
    if (!catalogTools.has(tool)) throw new Error(`${entry.skill} references unknown Tool ${tool}.`);
  }
  for (const [tool, actions] of Object.entries(entry.actions ?? {})) {
    const available = catalogTools.get(tool);
    if (!available) throw new Error(`${entry.skill} action map references unknown Tool ${tool}.`);
    for (const action of actions) {
      if (!available.has(action)) throw new Error(`${entry.skill} references unknown action ${tool}.${action}.`);
    }
  }
  const forbiddenNames = ["mcp__", "localhost", "aixcut.cn", "aixcut.com/mcp", "api_key", "access_token"];
  const lower = skillText.toLowerCase();
  for (const value of forbiddenNames) {
    if (lower.includes(value)) throw new Error(`${entry.skill} contains host-specific or sensitive text: ${value}`);
  }
}
if (!/^\d+\.\d+\.\d+$/.test(compatibility.helper_schema_version)) {
  throw new Error("Invalid helper schema version.");
}

const out = await mkdtemp(join(tmpdir(), "aixcut-plugin-validate-"));
try {
  const build = spawnSync(
    process.execPath,
    [join(scriptRoot, "scripts/build.mjs"), "--root", root, "--out", out],
    { encoding: "utf8" },
  );
  if (build.status !== 0) throw new Error(build.stderr || "Codex package build failed.");
  if ((await treeHash(out)) !== (await treeHash(join(root, "codex")))) {
    throw new Error("Committed Codex package is stale; run npm run build and include the generated package.");
  }
  try {
    await access(join(out, ".mcp.json"));
    throw new Error("Codex plugin package must not bundle a fixed MCP endpoint.");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
} finally {
  await rm(out, { recursive: true, force: true });
}
console.log(`Validation passed: ${skillNames.length} Skills, ${catalogTools.size} MCP Tools, Codex package.`);
