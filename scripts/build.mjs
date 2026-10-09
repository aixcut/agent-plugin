#!/usr/bin/env node
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outFlag = args.indexOf("--out");
const rootFlag = args.indexOf("--root");
const root = resolve(rootFlag >= 0 ? args[rootFlag + 1] ?? scriptRoot : scriptRoot);
const output = resolve(root, outFlag >= 0 ? args[outFlag + 1] ?? "codex" : "codex");
for (const source of ["codex/.codex-plugin", "shared/skills", "shared/scripts", "shared/assets"]) {
  const sourcePath = resolve(root, source);
  if (output === sourcePath || output.startsWith(`${sourcePath}/`)) {
    throw new Error(`Build output cannot overwrite package source: ${source}`);
  }
}

const manifest = join(root, "codex/.codex-plugin/plugin.json");
const skills = join(root, "shared/skills");
const scripts = join(root, "shared/scripts");
const assets = join(root, "shared/assets");
for (const path of [manifest, skills, scripts, assets]) {
  try {
    await (await import("node:fs/promises")).access(path);
  } catch {
    throw new Error(`Required package source is missing: ${path}`);
  }
}

if (output === resolve(root, "codex")) {
  for (const generated of ["skills", "scripts", "assets"]) {
    await rm(join(output, generated), { recursive: true, force: true });
  }
} else {
  await rm(output, { recursive: true, force: true });
}
await mkdir(output, { recursive: true });
await mkdir(join(output, ".codex-plugin"), { recursive: true });
if (manifest !== join(output, ".codex-plugin/plugin.json")) {
  await cp(manifest, join(output, ".codex-plugin/plugin.json"));
}
const copySkillTree = async (source, destination) => {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const relative = from.slice(skills.length + 1);
    if (entry.isDirectory()) {
      if (entry.name === "references" || entry.name === "agents") {
        await copySkillTree(from, join(destination, entry.name));
      }
      continue;
    }
    const allowed = entry.name === "SKILL.md" ||
      (relative.includes("/references/") && entry.name.endsWith(".md")) ||
      (relative.includes("/agents/") && entry.name === "openai.yaml");
    if (allowed) await cp(from, join(destination, entry.name));
  }
};
for (const skill of await readdir(skills, { withFileTypes: true })) {
  if (!skill.isDirectory()) continue;
  await copySkillTree(join(skills, skill.name), join(output, "skills", skill.name));
}
for (const helper of ["local-media-bridge.mjs", "download-capture-artifacts.mjs"]) {
  await cp(join(scripts, helper), join(output, "scripts", helper));
}
await cp(join(assets, "logo.svg"), join(output, "assets/logo.svg"));
const skillNames = (await readdir(skills)).sort();
console.log(`Built Codex plugin package at ${output} (${skillNames.length} skills).`);
