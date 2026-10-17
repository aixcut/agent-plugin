#!/usr/bin/env node
import { access, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyCore } from "./core.mjs";
import { createReleaseManifest } from "./release-manifest.mjs";
import { parse as parseYaml } from "yaml";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flagValue = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
if (args.includes("--host") && flagValue("--host") !== "codex") throw new Error("This repository builds Codex only");
const root = resolve(flagValue("--root") ?? scriptRoot);
const output = resolve(root, flagValue("--out") ?? "codex");

const assertSourceNotOverwritten = (paths) => {
  for (const sourcePath of paths) {
    if (output === root || output === sourcePath || output.startsWith(`${sourcePath}/`)) {
      throw new Error(`Build output cannot overwrite package source: ${sourcePath}`);
    }
  }
};
const requireSource = async (path, label = path) => {
  try { await access(path); } catch { throw new Error(`Required package source is missing: ${label}: ${path}`); }
};
const copySkillTree = async ({ source, destination, includeAgents }) => {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "references" || (includeAgents && entry.name === "agents")) {
        await copySkillTree({ source: from, destination: join(destination, entry.name), includeAgents });
      }
      continue;
    }
    if (entry.name === "SKILL.md" ||
        (source.includes("/references") && entry.name.endsWith(".md")) ||
        (includeAgents && source.includes("/agents") && entry.name === "openai.yaml")) {
      await cp(from, join(destination, entry.name));
    }
  }
};
const buildCodex = async () => {
  const manifest = join(root, "codex/.codex-plugin/plugin.json");
  const skills = join(root, "shared/skills");
  const scripts = join(root, "vendor/plugin-core/helpers");
  const assets = join(root, "shared/assets");
  const sources = [manifest, skills, scripts, assets].map((path) => resolve(path));
  assertSourceNotOverwritten(sources);
  for (const path of sources) await requireSource(path);
  await verifyCore(root);

  if (output === resolve(root, "codex")) {
    for (const generated of ["skills", "scripts", "assets", "contracts", "references", "release-manifest.json"]) await rm(join(output, generated), { recursive: true, force: true });
  } else await rm(output, { recursive: true, force: true });
  await mkdir(join(output, ".codex-plugin"), { recursive: true });
  if (manifest !== join(output, ".codex-plugin/plugin.json")) {
    await cp(manifest, join(output, ".codex-plugin/plugin.json"));
  }
  for (const skill of await readdir(skills, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    await copySkillTree({ source: join(skills, skill.name), destination: join(output, "skills", skill.name), includeAgents: true });
  }
  for (const helper of (await readdir(scripts)).filter((name) => name.endsWith(".mjs"))) await cp(join(scripts, helper), join(output, "scripts", helper));
  for (const helper of ["release-manifest.mjs", "verify-release.mjs"]) await cp(join(scriptRoot, "scripts", helper), join(output, "scripts", helper));
  await mkdir(join(output, "contracts"), { recursive: true });
  for (const file of ["mcp-tool-catalog.json", "compatibility.json", "core-lock.json"]) await cp(join(root, "contracts", file), join(output, "contracts", file));
  await cp(join(root, "vendor/plugin-core/contracts/core-manifest.json"), join(output, "contracts/core-manifest.json"));
  await cp(join(root, "vendor/plugin-core/contracts"), join(output, "contracts/core"), { recursive: true });
  await cp(join(root, "vendor/plugin-core/references"), join(output, "references/core"), { recursive: true });
  const mapping = parseYaml(await readFile(join(root, "contracts/skill-tool-map.yaml"), "utf8"));
  await writeFile(join(output, "contracts/skill-tool-map.json"), `${JSON.stringify(mapping, null, 2)}\n`);
  await cp(join(assets, "logo.svg"), join(output, "assets/logo.svg"));
  await writeFile(join(output, "release-manifest.json"), `${JSON.stringify(await createReleaseManifest(output), null, 2)}\n`);
  console.log(`Built Codex plugin package at ${output} (${(await readdir(skills)).length} skills).`);
};

await buildCodex();
